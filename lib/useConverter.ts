"use client";

/**
 * The whole state machine for one page: probe, choose, convert, done or failed.
 *
 * Everything that is a fact about the conversation with the server lives here
 * and nowhere else. The components below are presentational: they are handed a
 * phase and a handful of callbacks, so there is exactly one place where a
 * status becomes a state, and exactly one place that has to be read to know
 * what the app does with a `415`.
 *
 * Three things in here are load-bearing and easy to lose in a refactor:
 *
 *   1. The media type of a `200` is checked here, against the target that was
 *      asked for — `lib/api.ts` does not know what was requested, and the
 *      contract makes a wrong type on a `200` a failure rather than a download.
 *   2. The object URL is created once and revoked on unmount, on reset, and
 *      before the next conversion. A page that forgets holds a 25 MiB blob
 *      alive for the lifetime of the tab.
 *   3. A conversion failure is a normal event. Nothing here logs, retries,
 *      or escalates on its own; it moves to a state that offers the person a
 *      single next action.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  type ConvertHandle,
  ConversionFailed,
  checkHealth,
  convert,
  fetchFormats,
} from "./api";
import {
  ARCHIVE_MEDIA_TYPE,
  MAX_CONVERT_FILES,
  MAX_CONVERT_TOTAL_BYTES,
  MAX_UPLOAD_BYTES,
  RATE_LIMIT_COOLDOWN_MS,
} from "./constants";
import type { FormatsResponse, SourceFormat, TargetFormat, TargetId } from "./contract";
import {
  type Failure,
  invalidatesMatrix,
  mediaTypeMismatchFailure,
  networkFailure,
  rejectedFailure,
} from "./errors";
import {
  acceptAttribute,
  acceptedExtensions as matrixExtensions,
  downloadExtension,
  expectedMediaType,
  findSource,
  findTarget,
  isReachable,
  isTextTarget,
  normalizeMediaType,
  oversizedFileMessage,
  unsupportedFileMessage,
} from "./formats";
import { buildDownloadName } from "./contentDisposition";
import { formatBytes } from "./format";
import { buildPreviewDocument } from "./preview";
import { findEntryForFile, parseConvertZip, type ZipErrorEntry } from "./zip";

/** `MAX_CONVERT_TOTAL_BYTES`, formatted for a sentence. */
function formatMaxTotal(): string {
  return formatBytes(MAX_CONVERT_TOTAL_BYTES);
}

export type HealthState = "checking" | "ready" | "unavailable";

export type Phase =
  | { name: "ready" }
  | {
      name: "converting";
      stage: "uploading" | "converting";
      loaded: number;
      /** `null` when the browser cannot compute a total: the phase is indeterminate. */
      total: number | null;
    }
  | { name: "done"; result: ConversionResult }
  | { name: "done-bulk"; result: BulkConversionResult }
  | { name: "failed"; failure: Failure };

export interface ConversionResult {
  /** What the file is called on screen and on disk. Never a server path. */
  filename: string;
  byteSize: number;
  targetId: TargetId;
  targetLabel: string;
  /** True for an image target: the response is a ZIP of one image per page. */
  isArchive: boolean;
  /** True when the target's own media type is text, so a preview is possible. */
  isText: boolean;
  /** True for the `html` target, whose preview is inserted as markup. */
  isHtml: boolean;
  elapsedMs: number;
  downloadUrl: string;
  /** Kept so the preview can be built on demand instead of on every success. */
  blob: Blob;
}

/**
 * One input file's outcome inside a bulk (2+ file) conversion.
 *
 * The server's response is always one ZIP holding one entry per input file,
 * plus an `errors.json` naming any per-file failure — see
 * `components/responses/ConvertedToTarget`. This is that same information,
 * attributed back to the file it came from and ready to render.
 */
export interface BulkFileOutcome {
  /** The name the file was uploaded under. */
  inputName: string;
  success: boolean;
  /** The path of this file's entry inside the archive, when it succeeded. */
  entryName: string | null;
  byteSize: number | null;
  /**
   * A per-file download, when the entry is a single file rather than a folder
   * (an image target's multi-page result stays inside the overall archive
   * only — see `zipDownloadUrl` on `BulkConversionResult`).
   */
  downloadUrl: string | null;
  /** The server's own sentence, from this file's `errors.json` entry. */
  errorMessage: string | null;
}

export interface BulkConversionResult {
  targetId: TargetId;
  targetLabel: string;
  elapsedMs: number;
  /** Every input file's outcome, in upload order. */
  outcomes: BulkFileOutcome[];
  /** The archive as a whole — always offered, whatever the mix of outcomes. */
  zipFilename: string;
  zipByteSize: number;
  zipDownloadUrl: string;
  zipBlob: Blob;
}

export interface Converter {
  formats: FormatsResponse | null;
  formatsFailure: Failure | null;
  isLoadingFormats: boolean;
  reloadFormats: () => void;

  health: HealthState;
  healthFailure: Failure | null;
  recheckHealth: () => void;

  /** The chosen file, when exactly one is chosen. `null` in bulk mode. */
  file: File | null;
  /** Every chosen file, in the order they were added. `[file]` in single mode. */
  files: readonly File[];
  /** One rejection sentence per file `addFiles` refused to add, most recent last. */
  fileErrors: readonly string[];
  source: SourceFormat | null;
  targetId: TargetId | null;
  phase: Phase;

  elapsedMs: number;
  cooldownRemainingMs: number;
  canConvert: boolean;

  /**
   * The format this instance is fixed to, or `null` when the person chooses.
   *
   * The panel reads this to decide whether to render the format picker at all.
   */
  lockedTargetId: TargetId | null;
  /** The extensions this instance accepts — the whole matrix, unless narrowed. */
  acceptedExtensions: readonly string[];
  /**
   * The `accept` attribute for the file input: `acceptedExtensions` plus each
   * one's MIME type, so a mobile picker filtering by MIME doesn't hide every
   * file. See `acceptAttribute` in `lib/formats.ts`.
   */
  acceptAttribute: string;
  /** The most files one request may carry, and their combined size limit. */
  maxFiles: number;
  maxTotalBytes: number;

  previewText: string | null;
  isLoadingPreview: boolean;

  /** Replace the whole selection with this one file. The single-file path. */
  selectFile: (file: File) => void;
  /** Add one or more files to the selection, validating each on its own. */
  addFiles: (files: readonly File[]) => void;
  /** Drop one file out of the selection, by its position in `files`. */
  removeFile: (index: number) => void;
  clearFile: () => void;
  selectTarget: (targetId: TargetId) => void;
  start: () => void;
  cancel: () => void;
  /** Clear everything and return to an empty form. */
  reset: () => void;
  /** Keep the chosen file, drop the format — for a `415`, where the source was
   * fine and the target was not. */
  chooseAnotherFormat: () => void;
  loadPreview: () => void;
}

export interface ConverterOptions {
  /**
   * The one format this instance produces.
   *
   * A conversion page passes its target here, and the effect is a *lock*: the
   * picker is not rendered (see `StatusPanel`), `targetId` is always this, and
   * the page cannot be talked into producing anything else. Somebody who wanted
   * a different format is better served by the links to the sibling pages than
   * by a picker that would silently turn this page into a different one.
   *
   * Read once, on the first render.
   */
  lockedTargetId?: TargetId;
  /**
   * Narrow the accepted uploads to these extensions.
   *
   * Also a conversion page's concern: `/word_to_pdf` takes the three Word
   * extensions, and a PNG dropped on it should be refused with a sentence about
   * *this* page rather than quietly converted because the service happens to
   * accept PNGs. `null` means the whole matrix.
   */
  acceptedExtensions?: readonly string[];
}

export function useConverter(options?: ConverterOptions): Converter {
  const lockedTargetId = options?.lockedTargetId ?? null;
  const offeredExtensions = options?.acceptedExtensions ?? null;

  const [formats, setFormats] = useState<FormatsResponse | null>(null);
  const [formatsFailure, setFormatsFailure] = useState<Failure | null>(null);

  const [health, setHealth] = useState<HealthState>("checking");
  const [healthFailure, setHealthFailure] = useState<Failure | null>(null);

  const [files, setFiles] = useState<readonly File[]>([]);
  const [fileErrors, setFileErrors] = useState<readonly string[]>([]);
  const [targetId, setTargetId] = useState<TargetId | null>(lockedTargetId);
  const [phase, setPhase] = useState<Phase>({ name: "ready" });

  const [elapsedMs, setElapsedMs] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  const [previewText, setPreviewText] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const handleRef = useRef<ConvertHandle | null>(null);
  const downloadUrlRef = useRef<string | null>(null);
  /** Every object URL a bulk result created: the entries' and the archive's. */
  const bulkUrlsRef = useRef<string[]>([]);
  const startedAtRef = useRef(0);
  const mountedRef = useRef(true);

  /** The single chosen file, when there is exactly one. `null` in bulk mode. */
  const file = files.length === 1 ? (files[0] ?? null) : null;

  const source = useMemo(
    () => (formats && file ? findSource(formats, file.name) : null),
    [formats, file],
  );

  const revokeDownloadUrl = useCallback((): void => {
    if (downloadUrlRef.current === null) return;
    URL.revokeObjectURL(downloadUrlRef.current);
    downloadUrlRef.current = null;
  }, []);

  const revokeBulkUrls = useCallback((): void => {
    for (const url of bulkUrlsRef.current) URL.revokeObjectURL(url);
    bulkUrlsRef.current = [];
  }, []);

  /**
   * Fetch the matrix and the health state.
   *
   * Both are written as promise chains rather than `async` functions for a
   * reason: nothing here touches state until the response has arrived, so the
   * effect below can call them without setting state in its own body. That is
   * what React asks for, and it is also the better behaviour — no second render
   * before the request has even been made. "Loading" is not a flag these set;
   * it is what having no matrix and no failure means.
   */
  const loadFormats = useCallback((): void => {
    void fetchFormats()
      .then((matrix) => {
        if (!mountedRef.current) return;
        setFormats(matrix);
        setFormatsFailure(null);
      })
      .catch((error: unknown) => {
        if (!mountedRef.current) return;
        setFormatsFailure(error instanceof ConversionFailed ? error.failure : networkFailure());
      });
  }, []);

  const probeHealth = useCallback((): void => {
    void checkHealth()
      .then((result) => {
        if (!mountedRef.current) return;
        setHealth(result.ok ? "ready" : "unavailable");
        setHealthFailure(result.ok ? null : result.failure);
      })
      .catch(() => {
        // Only an abort lands here, and an abort means this component is gone.
      });
  }, []);

  const reloadFormats = useCallback((): void => {
    // From an event handler, so clearing the failure here is a normal
    // interaction — and it is what puts the skeleton back on screen.
    setFormats(null);
    setFormatsFailure(null);
    void loadFormats();
  }, [loadFormats]);

  const recheckHealth = useCallback((): void => {
    setHealth("checking");
    setHealthFailure(null);
    void probeHealth();
  }, [probeHealth]);

  useEffect(() => {
    mountedRef.current = true;
    void loadFormats();
    void probeHealth();

    return () => {
      mountedRef.current = false;
      handleRef.current?.abort();
      handleRef.current = null;
      revokeDownloadUrl();
      revokeBulkUrls();
    };
  }, [loadFormats, probeHealth, revokeDownloadUrl, revokeBulkUrls]);

  // The running timer. Tenths, so that a page that is working looks like it.
  useEffect(() => {
    if (phase.name !== "converting") return;
    const id = setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 100);
    return () => clearInterval(id);
  }, [phase.name]);

  // The `429` countdown, which is ours and not the server's: the response says
  // "in a moment" and does not say how long that is.
  useEffect(() => {
    if (cooldownUntil === null) return;
    const tick = (): void => {
      const current = Date.now();
      setNow(current);
      if (current >= cooldownUntil) setCooldownUntil(null);
    };
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const cooldownRemainingMs = cooldownUntil === null ? 0 : Math.max(0, cooldownUntil - now);

  /**
   * Return the target to its resting value.
   *
   * Every path that used to clear the target goes through here, because on a
   * locked page `null` is not a resting value — it is a page that has forgotten
   * what it is about. On those pages the resting value is the lock itself.
   */
  const resetTarget = useCallback((): void => {
    setTargetId(lockedTargetId);
  }, [lockedTargetId]);

  /**
   * Whether a single file may join the current selection, or the sentence
   * saying why not.
   *
   * Shared by `selectFile` (which always starts from an empty selection) and
   * `addFiles` (which validates each candidate against the files already
   * chosen), so the two can never disagree about what a valid file is.
   */
  const validateCandidate = useCallback(
    (
      next: File,
      alongside: readonly File[],
      matrix: FormatsResponse,
    ): { source: SourceFormat } | { message: string } => {
      if (next.size > MAX_UPLOAD_BYTES) {
        return { message: oversizedFileMessage(next.name, next.size) };
      }

      const nextSource = findSource(matrix, next.name);

      // Two ways to be refused here, and they are different sentences. The
      // matrix meaning "the service does not take this at all" is one; this
      // page meaning "I am the Word to PDF page" is the other. A PNG dropped on
      // `word_to_pdf` is refused by the second rule even though the first would
      // allow it, and the sentence names the extensions *this page* takes.
      const narrowed =
        offeredExtensions !== null &&
        nextSource !== null &&
        !offeredExtensions.includes(nextSource.extension.toLowerCase());

      if (nextSource === null || narrowed) {
        return {
          message: unsupportedFileMessage(matrix, next.name, offeredExtensions ?? undefined),
        };
      }

      if (alongside.length + 1 > MAX_CONVERT_FILES) {
        return {
          message: `${next.name} was not added: this converter takes at most ${MAX_CONVERT_FILES} files at once.`,
        };
      }

      const totalBytes = alongside.reduce((sum, f) => sum + f.size, 0) + next.size;
      if (totalBytes > MAX_CONVERT_TOTAL_BYTES) {
        return {
          message: `${next.name} was not added: the files chosen together may not exceed ${formatMaxTotal()}.`,
        };
      }

      return { source: nextSource };
    },
    [offeredExtensions],
  );

  const selectFile = useCallback(
    (next: File): void => {
      if (!formats) return;
      const verdict = validateCandidate(next, [], formats);

      if ("message" in verdict) {
        setFiles([]);
        resetTarget();
        setPhase({ name: "failed", failure: rejectedFailure(verdict.message) });
        return;
      }

      revokeDownloadUrl();
      revokeBulkUrls();
      setPreviewText(null);
      setFiles([next]);
      setFileErrors([]);
      setPhase({ name: "ready" });
      // A target chosen for a previous file survives only if this file can
      // still reach it — except on a locked page, where the target is not the
      // person's choice to lose. There the reachability is somebody else's
      // problem: the picker is gone, so an unreachable lock is surfaced as a
      // disabled button with a reason rather than as a silently cleared format.
      setTargetId((current) =>
        lockedTargetId !== null
          ? lockedTargetId
          : current !== null && isReachable(verdict.source, current)
            ? current
            : null,
      );
    },
    [formats, lockedTargetId, resetTarget, revokeBulkUrls, revokeDownloadUrl, validateCandidate],
  );

  /**
   * Add one or more files to the current selection.
   *
   * Each candidate is validated against the files already present (including
   * ones added earlier in the same call), so a batch that starts out fine and
   * then crosses the file-count or total-size ceiling adds everything up to
   * the ceiling and reports the rest as refused, rather than refusing the
   * whole batch.
   */
  const addFiles = useCallback(
    (candidates: readonly File[]): void => {
      if (!formats || candidates.length === 0) return;
      const matrix = formats;

      // The very first file chosen for an empty form is the single-file path
      // this app has always had: a refusal here is a failure state with a
      // "choose a different file" recovery, not a line in a list that still
      // has nothing else in it. `selectFile` already is exactly that
      // behaviour, so route to it rather than duplicate it.
      if (files.length === 0 && candidates.length === 1) {
        selectFile(candidates[0] as File);
        return;
      }

      setFiles((current) => {
        const accepted: File[] = [...current];
        const rejections: string[] = [];

        for (const candidate of candidates) {
          const verdict = validateCandidate(candidate, accepted, matrix);
          if ("message" in verdict) {
            rejections.push(verdict.message);
            continue;
          }
          accepted.push(candidate);
        }

        if (rejections.length > 0) {
          setFileErrors(rejections);
        } else {
          setFileErrors([]);
        }

        if (accepted.length === current.length) return current;

        revokeDownloadUrl();
        revokeBulkUrls();
        setPreviewText(null);
        setPhase({ name: "ready" });

        // The target picked for a smaller selection survives only if every
        // file in the new one can still reach it; a locked page keeps its
        // lock regardless, exactly as `selectFile` does.
        if (lockedTargetId === null) {
          setTargetId((currentTarget) => {
            if (currentTarget === null) return currentTarget;
            const stillReachable = accepted.every((f) => {
              const s = findSource(formats, f.name);
              return s !== null && isReachable(s, currentTarget);
            });
            return stillReachable ? currentTarget : null;
          });
        }

        return accepted;
      });
    },
    [files, formats, lockedTargetId, revokeBulkUrls, revokeDownloadUrl, selectFile, validateCandidate],
  );

  const removeFile = useCallback(
    (index: number): void => {
      revokeDownloadUrl();
      revokeBulkUrls();
      setPreviewText(null);
      setPhase({ name: "ready" });
      setFiles((current) => current.filter((_, i) => i !== index));
    },
    [revokeBulkUrls, revokeDownloadUrl],
  );

  const clearFile = useCallback((): void => {
    revokeDownloadUrl();
    revokeBulkUrls();
    setPreviewText(null);
    setFiles([]);
    setFileErrors([]);
    resetTarget();
    setPhase({ name: "ready" });
  }, [resetTarget, revokeBulkUrls, revokeDownloadUrl]);

  const selectTarget = useCallback(
    (next: TargetId): void => {
      // A locked page has no picker to click, so this cannot fire from one; the
      // guard is here so that a future caller cannot talk a page out of its own
      // subject.
      if (lockedTargetId !== null) return;
      setTargetId(next);
    },
    [lockedTargetId],
  );

  const start = useCallback((): void => {
    if (!formats || files.length === 0 || !targetId) return;
    const target = findTarget(formats, targetId);
    if (target === null) return;

    revokeDownloadUrl();
    revokeBulkUrls();
    setPreviewText(null);
    setElapsedMs(0);
    startedAtRef.current = Date.now();
    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
    setPhase({ name: "converting", stage: "uploading", loaded: 0, total: totalBytes });

    const isBulk = files.length > 1;

    const handle = convert(targetId, files, {
      onUploadProgress: (progress) => {
        setPhase((current) =>
          // Only while the upload is still the phase. A progress event that
          // arrives after the body is on the wire would otherwise drag the
          // label back to "Uploading" and leave it there.
          current.name === "converting" && current.stage === "uploading"
            ? {
                name: "converting",
                stage: "uploading",
                loaded: progress.loaded,
                total: progress.total,
              }
            : current,
        );
      },
      onUploadComplete: () => {
        setPhase((current) =>
          current.name === "converting" ? { ...current, stage: "converting" } : current,
        );
      },
    });
    handleRef.current = handle;

    void handle.promise
      .then((result) => {
        if (!mountedRef.current) return;
        handleRef.current = null;
        const elapsed = Date.now() - startedAtRef.current;

        if (isBulk) {
          // With two or more files the response is always a ZIP, whatever the
          // target — the contract does not tie it to the target's own media
          // type the way a single-file response is.
          if (normalizeMediaType(result.mediaType) !== ARCHIVE_MEDIA_TYPE) {
            setPhase({ name: "failed", failure: mediaTypeMismatchFailure(result.requestId) });
            return;
          }
          void buildBulkResult(files, target, result.blob, result.disposition, elapsed).then(
            (bulkResult) => {
              if (!mountedRef.current) return;
              bulkUrlsRef.current = collectBulkUrls(bulkResult);
              setPhase({ name: "done-bulk", result: bulkResult });
            },
          );
          return;
        }

        // The check the contract puts on the client: a 200 whose Content-Type
        // is not the target's own is a failure, and the file is not offered.
        const expected = expectedMediaType(target);
        if (normalizeMediaType(result.mediaType) !== expected) {
          setPhase({
            name: "failed",
            failure: mediaTypeMismatchFailure(result.requestId),
          });
          return;
        }

        const downloadUrl = URL.createObjectURL(result.blob);
        downloadUrlRef.current = downloadUrl;

        setPhase({
          name: "done",
          result: {
            filename: buildDownloadName(result.disposition, downloadExtension(target)),
            byteSize: result.blob.size,
            targetId: target.id,
            targetLabel: target.label,
            isArchive: target.multiple,
            isText: isTextTarget(target),
            isHtml: normalizeMediaType(target.mediaType) === "text/html",
            elapsedMs: elapsed,
            downloadUrl,
            blob: result.blob,
          },
        });
      })
      .catch((error: unknown) => {
        if (!mountedRef.current) return;
        handleRef.current = null;
        const failure = error instanceof ConversionFailed ? error.failure : networkFailure();

        if (failure.status === 429) {
          setNow(Date.now());
          setCooldownUntil(Date.now() + RATE_LIMIT_COOLDOWN_MS);
        }
        // A `404` or a `415` means this build's copy of the matrix disagrees
        // with the server's. Asking again is the only useful response.
        if (invalidatesMatrix(failure)) void loadFormats();
        if (failure.status === 404) resetTarget();

        setPhase({ name: "failed", failure });
      });
  }, [files, formats, loadFormats, resetTarget, revokeBulkUrls, revokeDownloadUrl, targetId]);

  const cancel = useCallback((): void => {
    // The rejection from the abort is what moves the state, so that a cancel
    // and a timeout take exactly the same path out of "converting".
    handleRef.current?.abort();
  }, []);

  const reset = useCallback((): void => {
    handleRef.current?.abort();
    handleRef.current = null;
    revokeDownloadUrl();
    revokeBulkUrls();
    setPreviewText(null);
    setElapsedMs(0);
    setFiles([]);
    setFileErrors([]);
    resetTarget();
    setPhase({ name: "ready" });
  }, [resetTarget, revokeBulkUrls, revokeDownloadUrl]);

  const chooseAnotherFormat = useCallback((): void => {
    handleRef.current?.abort();
    handleRef.current = null;
    revokeDownloadUrl();
    revokeBulkUrls();
    setPreviewText(null);
    setElapsedMs(0);
    resetTarget();
    setPhase({ name: "ready" });
  }, [resetTarget, revokeBulkUrls, revokeDownloadUrl]);

  const loadPreview = useCallback((): void => {
    if (phase.name !== "done" || !phase.result.isText) return;
    const { blob, isHtml } = phase.result;
    setIsLoadingPreview(true);
    void blob.text().then((text) => {
      if (!mountedRef.current) return;
      setPreviewText(buildPreviewDocument(text, isHtml));
      setIsLoadingPreview(false);
    });
  }, [phase]);

  /**
   * Whether the chosen file(s) can reach the chosen target.
   *
   * Required for a single file, exactly as before. Not required in bulk mode:
   * the contract is explicit that a file which cannot reach the target does
   * not stop the rest of the batch, so a mismatched file among several is a
   * per-file failure to report after the request, not a reason to block it.
   */
  const singleFileReachable =
    files.length !== 1 || (source !== null && targetId !== null && isReachable(source, targetId));

  const canConvert =
    health === "ready" &&
    formats !== null &&
    files.length > 0 &&
    targetId !== null &&
    singleFileReachable &&
    cooldownRemainingMs === 0 &&
    phase.name === "ready";

  /**
   * The extensions this instance accepts, narrowed for a conversion page.
   *
   * Falls back to the whole matrix, and is empty before it has loaded — which
   * is what the drop zone shows in its skeleton state.
   */
  const accepted = useMemo<readonly string[]>(
    () => offeredExtensions ?? (formats === null ? [] : matrixExtensions(formats)),
    [formats, offeredExtensions],
  );

  const acceptAttr = useMemo<string>(
    () => (formats === null ? accepted.join(",") : acceptAttribute(formats, accepted)),
    [formats, accepted],
  );

  return {
    formats,
    formatsFailure,
    // `isLoadingFormats` → derived, then deleted. Kept out of the return
    // entirely: having neither an answer nor a failure *is* the loading state.
    isLoadingFormats: formats === null && formatsFailure === null,
    reloadFormats,

    health,
    healthFailure,
    recheckHealth,

    file,
    files,
    fileErrors,
    source,
    targetId,
    phase,

    elapsedMs,
    cooldownRemainingMs,
    canConvert,

    lockedTargetId,
    acceptedExtensions: accepted,
    acceptAttribute: acceptAttr,
    maxFiles: MAX_CONVERT_FILES,
    maxTotalBytes: MAX_CONVERT_TOTAL_BYTES,

    previewText,
    isLoadingPreview,

    selectFile,
    addFiles,
    removeFile,
    clearFile,
    selectTarget,
    start,
    cancel,
    reset,
    chooseAnotherFormat,
    loadPreview,
  };
}

/**
 * Build a `BulkConversionResult` out of the raw ZIP the server sent back, by
 * unzipping it client-side and attributing every entry (and every
 * `errors.json` line) to the input file it came from.
 */
async function buildBulkResult(
  inputFiles: readonly File[],
  target: TargetFormat,
  zipBlob: Blob,
  disposition: string | null,
  elapsedMs: number,
): Promise<BulkConversionResult> {
  const parsed = await parseConvertZip(zipBlob);
  const errorsByFile = new Map<string, ZipErrorEntry>();
  for (const entry of parsed.errors) errorsByFile.set(entry.file, entry);

  const outcomes: BulkFileOutcome[] = inputFiles.map((input, index) => {
    const failure = errorsByFile.get(input.name);
    if (failure) {
      return {
        inputName: input.name,
        success: false,
        entryName: null,
        byteSize: null,
        downloadUrl: null,
        errorMessage: failure.message,
      };
    }

    const entryName = findEntryForFile(parsed.entryNames, input.name, index);
    const bytes = entryName ? parsed.entries.get(entryName) : undefined;

    if (!entryName || !bytes) {
      // Neither an entry nor an `errors.json` line names this file: the
      // archive could not be attributed to it. Reported as a failure rather
      // than silently dropped, so the person is not left wondering.
      return {
        inputName: input.name,
        success: false,
        entryName: null,
        byteSize: null,
        downloadUrl: null,
        errorMessage: "Not found in the converted archive.",
      };
    }

    // A folder entry (an image target's per-page result) has no single blob
    // of its own — its bytes stay inside the overall archive download.
    const isFolderEntry = entryName.includes("/");
    const downloadUrl = isFolderEntry
      ? null
      : URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: expectedMediaType(target) }));

    return {
      inputName: input.name,
      success: true,
      entryName,
      byteSize: bytes.byteLength,
      downloadUrl,
      errorMessage: null,
    };
  });

  const zipDownloadUrl = URL.createObjectURL(zipBlob);

  return {
    targetId: target.id,
    targetLabel: target.label,
    elapsedMs,
    outcomes,
    zipFilename: buildDownloadName(disposition, ".zip"),
    zipByteSize: zipBlob.size,
    zipDownloadUrl,
    zipBlob,
  };
}

/** Every object URL a bulk result created, for cleanup. */
function collectBulkUrls(result: BulkConversionResult): string[] {
  const urls = result.outcomes
    .map((outcome) => outcome.downloadUrl)
    .filter((url): url is string => url !== null);
  urls.push(result.zipDownloadUrl);
  return urls;
}
