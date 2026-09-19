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
import { MAX_UPLOAD_BYTES, RATE_LIMIT_COOLDOWN_MS } from "./constants";
import type { FormatsResponse, SourceFormat, TargetId } from "./contract";
import {
  type Failure,
  invalidatesMatrix,
  mediaTypeMismatchFailure,
  networkFailure,
  rejectedFailure,
} from "./errors";
import {
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
import { buildPreviewDocument } from "./preview";

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

export interface Converter {
  formats: FormatsResponse | null;
  formatsFailure: Failure | null;
  isLoadingFormats: boolean;
  reloadFormats: () => void;

  health: HealthState;
  healthFailure: Failure | null;
  recheckHealth: () => void;

  file: File | null;
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

  previewText: string | null;
  isLoadingPreview: boolean;

  selectFile: (file: File) => void;
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

  const [file, setFile] = useState<File | null>(null);
  const [targetId, setTargetId] = useState<TargetId | null>(lockedTargetId);
  const [phase, setPhase] = useState<Phase>({ name: "ready" });

  const [elapsedMs, setElapsedMs] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  const [previewText, setPreviewText] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const handleRef = useRef<ConvertHandle | null>(null);
  const downloadUrlRef = useRef<string | null>(null);
  const startedAtRef = useRef(0);
  const mountedRef = useRef(true);

  const source = useMemo(
    () => (formats && file ? findSource(formats, file.name) : null),
    [formats, file],
  );

  const revokeDownloadUrl = useCallback((): void => {
    if (downloadUrlRef.current === null) return;
    URL.revokeObjectURL(downloadUrlRef.current);
    downloadUrlRef.current = null;
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
    };
  }, [loadFormats, probeHealth, revokeDownloadUrl]);

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

  const selectFile = useCallback(
    (next: File): void => {
      if (!formats) return;

      // Refused before anything else happens, so that no request is spent and
      // no half-selected state is left behind.
      if (next.size > MAX_UPLOAD_BYTES) {
        setFile(null);
        resetTarget();
        setPhase({
          name: "failed",
          failure: rejectedFailure(oversizedFileMessage(next.name, next.size)),
        });
        return;
      }

      const nextSource = findSource(formats, next.name);

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
        setFile(null);
        resetTarget();
        setPhase({
          name: "failed",
          failure: rejectedFailure(
            unsupportedFileMessage(formats, next.name, offeredExtensions ?? undefined),
          ),
        });
        return;
      }

      revokeDownloadUrl();
      setPreviewText(null);
      setFile(next);
      setPhase({ name: "ready" });
      // A target chosen for a previous file survives only if this file can
      // still reach it — except on a locked page, where the target is not the
      // person's choice to lose. There the reachability is somebody else's
      // problem: the picker is gone, so an unreachable lock is surfaced as a
      // disabled button with a reason rather than as a silently cleared format.
      setTargetId((current) =>
        lockedTargetId !== null
          ? lockedTargetId
          : current !== null && isReachable(nextSource, current)
            ? current
            : null,
      );
    },
    [formats, lockedTargetId, offeredExtensions, resetTarget, revokeDownloadUrl],
  );

  const clearFile = useCallback((): void => {
    revokeDownloadUrl();
    setPreviewText(null);
    setFile(null);
    resetTarget();
    setPhase({ name: "ready" });
  }, [resetTarget, revokeDownloadUrl]);

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
    if (!formats || !file || !targetId) return;
    const target = findTarget(formats, targetId);
    if (target === null) return;

    revokeDownloadUrl();
    setPreviewText(null);
    setElapsedMs(0);
    startedAtRef.current = Date.now();
    setPhase({ name: "converting", stage: "uploading", loaded: 0, total: file.size });

    const handle = convert(targetId, file, {
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
  }, [file, formats, loadFormats, resetTarget, revokeDownloadUrl, targetId]);

  const cancel = useCallback((): void => {
    // The rejection from the abort is what moves the state, so that a cancel
    // and a timeout take exactly the same path out of "converting".
    handleRef.current?.abort();
  }, []);

  const reset = useCallback((): void => {
    handleRef.current?.abort();
    handleRef.current = null;
    revokeDownloadUrl();
    setPreviewText(null);
    setElapsedMs(0);
    setFile(null);
    resetTarget();
    setPhase({ name: "ready" });
  }, [resetTarget, revokeDownloadUrl]);

  const chooseAnotherFormat = useCallback((): void => {
    handleRef.current?.abort();
    handleRef.current = null;
    revokeDownloadUrl();
    setPreviewText(null);
    setElapsedMs(0);
    resetTarget();
    setPhase({ name: "ready" });
  }, [resetTarget, revokeDownloadUrl]);

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

  const canConvert =
    health === "ready" &&
    formats !== null &&
    file !== null &&
    targetId !== null &&
    source !== null &&
    // The picker only ever hands over a reachable target, so on an unlocked
    // page this is already true. It is here for the locked ones: a page whose
    // format is fixed has no picker to disable, so if the service stops
    // supporting its conversion the only honest thing left is a button that
    // will not run, next to the server's own sentence about why.
    isReachable(source, targetId) &&
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
    source,
    targetId,
    phase,

    elapsedMs,
    cooldownRemainingMs,
    canConvert,

    lockedTargetId,
    acceptedExtensions: accepted,

    previewText,
    isLoadingPreview,

    selectFile,
    clearFile,
    selectTarget,
    start,
    cancel,
    reset,
    chooseAnotherFormat,
    loadPreview,
  };
}
