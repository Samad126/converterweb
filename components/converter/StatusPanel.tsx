"use client";

/**
 * The four states of a conversion, and exactly one primary action in each.
 *
 *   ready      — pick a file, pick a format, press Convert
 *   converting — watch it, or cancel it
 *   done       — download it, or start another
 *   failed     — read the server's sentence, then take the one way forward
 *
 * The failed state is the interesting one. Some failures leave the file and the
 * format valid, so the only sensible action is another attempt at the same
 * thing. Others mean the choice itself was wrong — a password-protected
 * document, an extension the converter does not take, a target this build
 * believed existed — and there the form has to come back so the person can
 * choose differently. `recoveryFor` decides which, and the form is rendered
 * only for the second kind.
 *
 * **Locked pages.** A conversion page has one format and no picker: step 2 does
 * not exist, the three steps become two, and the file input offers only the
 * extensions that page accepts. See `ConverterShell`. The rest of this panel is
 * deliberately identical between the two modes — the progress, the errors, the
 * result and the recovery paths are the same behaviour, because they are the
 * same conversion; only the choice has gone.
 */
import { useCallback, useMemo, useRef } from "react";

import type { FormatsResponse, SourceFormat, TargetId } from "@/lib/api/contract";
import { recoveryFor, type Failure, type Recovery } from "@/lib/api/errors";
import { formatBytes } from "@/lib/format";
import { findSource, findTarget, isReachable, unreachableReason } from "@/lib/converter/formats";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import type { HealthState, Phase } from "@/lib/converter/useConverter";

import { BulkResultCard } from "./BulkResultCard";
import { DropZone } from "../ui/DropZone";
import { ErrorNote } from "../ui/ErrorNote";
import { FileIcon } from "../ui/Icons";
import { FormatPicker } from "./FormatPicker";
import { ProgressMeter } from "../ui/ProgressMeter";
import { ResultCard } from "./ResultCard";

/** The file input's id, so a "choose a different file" action can focus it. */
export const FILE_INPUT_ID = "converter-file";

export interface StatusPanelProps {
  formats: FormatsResponse;
  source: SourceFormat | null;
  file: File | null;
  /** Every file chosen, in the order they were added. */
  files: readonly File[];
  /** One rejection sentence per file that could not be added, most recent last. */
  fileErrors: readonly string[];
  targetId: TargetId | null;
  phase: Phase;
  health: HealthState;
  elapsedMs: number;
  cooldownRemainingMs: number;
  canConvert: boolean;
  previewText: string | null;
  isLoadingPreview: boolean;
  /** The fixed format, when this panel is on a page about one conversion. */
  lockedTargetId: TargetId | null;
  /** The extensions this panel accepts — the matrix, unless the page narrowed it. */
  acceptedExtensions: readonly string[];
  /** The `accept` attribute for the file input — extensions plus MIME hints. */
  acceptAttribute: string;
  /** The most files one request may carry, and their combined size limit. */
  maxFiles: number;
  maxTotalBytes: number;

  onSelectFile: (file: File) => void;
  onAddFiles: (files: readonly File[]) => void;
  onRemoveFile: (index: number) => void;
  onClearFile: () => void;
  onSelectTarget: (target: TargetId) => void;
  onStart: () => void;
  onCancel: () => void;
  /** Clear the file and the format, and start again from an empty form. */
  onReset: () => void;
  /** Keep the file, drop the format: the source was fine, the target was not. */
  onChooseAnotherFormat: () => void;
  onLoadPreview: () => void;
}

export function StatusPanel(props: StatusPanelProps): React.ReactElement {
  const {
    formats,
    source,
    file,
    files,
    fileErrors,
    targetId,
    phase,
    health,
    elapsedMs,
    cooldownRemainingMs,
    canConvert,
    previewText,
    isLoadingPreview,
    lockedTargetId,
    acceptedExtensions,
    acceptAttribute,
    maxFiles,
    maxTotalBytes,
    onAddFiles,
    onRemoveFile,
    onClearFile,
    onSelectTarget,
    onStart,
    onCancel,
    onReset,
    onChooseAnotherFormat,
    onLoadPreview,
  } = props;

  const locked = lockedTargetId !== null;
  const selectedTarget = targetId === null ? null : findTarget(formats, targetId);

  /** Every chosen file's source, for the picker — see `FormatPicker`'s own doc. */
  const sources = useMemo<readonly SourceFormat[]>(() => {
    const found = files
      .map((f) => findSource(formats, f.name))
      .filter((s): s is SourceFormat => s !== null);
    return found;
  }, [files, formats]);

  // With no picker there is no second step, so Convert moves up rather than
  // leaving a gap where the format chooser used to be.
  const convertStep = locked ? 2 : 3;

  /**
   * A locked page whose format the source cannot reach.
   *
   * Impossible on a catalogue page — the groups are built from the matrix — but
   * entirely possible if the service drops a target after a page was built. The
   * page cannot offer another format, so the honest thing is to say why and
   * leave the button refusing to run.
   */
  const unreachable =
    locked && source !== null && lockedTargetId !== null && !isReachable(source, lockedTargetId)
      ? unreachableReason(formats, lockedTargetId)
      : null;

  /**
   * Move the person to the file input rather than leaving them to find it.
   * After the re-render, so the input exists by the time we reach for it.
   */
  const focusFileInput = useCallback((): void => {
    onClearFile();
    requestAnimationFrame(() => {
      document.getElementById(FILE_INPUT_ID)?.focus();
    });
  }, [onClearFile]);

  /**
   * `DropZone` fires `onSelect` once per file, even for one native "choose
   * several files" gesture — so a person picking three files at once would
   * otherwise turn into three separate `addFiles` calls, each seeing a state
   * that has not caught up with the one before it. Every file from the same
   * gesture lands here in the same synchronous stretch of code, so batching
   * them into one array before the microtask queue's next turn is enough to
   * turn them back into one `addFiles([a, b, c])` call.
   */
  const pendingSelectionRef = useRef<File[]>([]);
  const flushScheduledRef = useRef(false);
  const handleFileSelected = useCallback(
    (file: File): void => {
      pendingSelectionRef.current.push(file);
      if (flushScheduledRef.current) return;
      flushScheduledRef.current = true;
      void Promise.resolve().then(() => {
        flushScheduledRef.current = false;
        const batch = pendingSelectionRef.current;
        pendingSelectionRef.current = [];
        onAddFiles(batch);
      });
    },
    [onAddFiles],
  );

  const handleAction = useCallback(
    (recovery: Recovery): void => {
      switch (recovery) {
        case "different-file":
          focusFileInput();
          return;
        case "choose-format":
          // The file stays; the format is what has to change. A fresh copy of
          // the matrix has already been fetched by the time this is on screen,
          // so the picker that comes back is the server's current one.
          //
          // A locked page has no other format to offer, so the same failure has
          // only one way forward: a different file. Offering "choose another
          // format" on a page with one format would be a button that does
          // nothing.
          if (locked) {
            focusFileInput();
            return;
          }
          onChooseAnotherFormat();
          return;
        case "start-over":
          onReset();
          return;
        default:
          onStart();
      }
    },
    [focusFileInput, locked, onChooseAnotherFormat, onReset, onStart],
  );

  if (phase.name === "done") {
    return (
      <ResultCard
        result={phase.result}
        previewText={previewText}
        isLoadingPreview={isLoadingPreview}
        onLoadPreview={onLoadPreview}
        onReset={onReset}
      />
    );
  }

  if (phase.name === "done-bulk") {
    return <BulkResultCard result={phase.result} onReset={onReset} />;
  }

  const busy = phase.name === "converting";
  const failure: Failure | null = phase.name === "failed" ? phase.failure : null;
  const recovery = failure === null ? null : recoveryFor(failure);

  // The form comes back when the choice itself has to change; it stays away
  // when the only useful thing is another attempt at the same file and format.
  const offerForm =
    recovery === null ||
    recovery === "different-file" ||
    recovery === "choose-format" ||
    recovery === "start-over";

  const hint = describeBlocker({
    hasFiles: files.length > 0,
    selectedTarget,
    health,
    canConvert,
    busy,
  });

  return (
    <div className="flex flex-col gap-8">
      {failure !== null && recovery !== null ? (
        <ErrorNote
          failure={failure}
          recovery={recovery}
          cooldownRemainingMs={cooldownRemainingMs}
          onAction={() => handleAction(recovery)}
        />
      ) : null}

      {offerForm ? (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="step-heading">
              <span className="step-number">1</span>{" "}
              Choose a file
            </h2>

            {files.length === 1 && file !== null ? (
              <div className="file-row">
                <FileIcon size={20} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="file-name">{file.name}</p>
                  <p className="meta">{formatBytes(file.size)}</p>
                </div>
                <button
                  type="button"
                  className="btn-quiet shrink-0"
                  onClick={onClearFile}
                  disabled={busy}
                >
                  Remove
                </button>
              </div>
            ) : null}

            {files.length > 1 ? (
              <ol className="flex flex-col gap-2">
                {files.map((chosen, index) => (
                  <li key={`${chosen.name}-${index}`} className="chosen-file">
                    <span className="file-name">
                      {index + 1}. {chosen.name}
                    </span>
                    <span className="meta">{formatBytes(chosen.size)}</span>
                    <button
                      type="button"
                      className="btn-quiet"
                      onClick={() => onRemoveFile(index)}
                      disabled={busy}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ol>
            ) : null}

            {fileErrors.length > 0 ? (
              <ul className="flex flex-col gap-1" role="alert">
                {fileErrors.map((message, index) => (
                  <li key={index} className="notice">
                    {message}
                  </li>
                ))}
              </ul>
            ) : null}

            <DropZone
              id={FILE_INPUT_ID}
              accept={acceptAttribute}
              acceptedLabel={acceptedExtensions.join(", ")}
              limitLabel={formatBytes(MAX_UPLOAD_BYTES)}
              disabled={busy || files.length >= maxFiles}
              multiple
              onSelect={handleFileSelected}
            />
            {files.length >= maxFiles ? (
              <p className="meta">
                Up to {maxFiles} files at once, {formatBytes(maxTotalBytes)} combined — remove one
                to add another.
              </p>
            ) : null}
          </section>

          {/*
            Step 2, and only on a page that has not already decided. A locked
            page skips it entirely rather than showing a picker with one option
            in it — the format is stated in the page's heading, its badge and its
            copy, and a control with nothing to control is just noise.
          */}
          {locked ? null : (
            <section className="flex flex-col gap-3">
              <h2 className="step-heading">
                <span className="step-number">2</span>{" "}
                Choose an output format
              </h2>

              <FormatPicker
                name="target"
                formats={formats}
                sources={sources}
                selected={targetId}
                inert={busy}
                onSelect={onSelectTarget}
              />
            </section>
          )}

          <section className="flex flex-col gap-3">
            <h2 className="step-heading">
              <span className="step-number">{convertStep}</span>{" "}
              Convert
            </h2>

            {selectedTarget?.multiple ? (
              <p className="meta">
                {selectedTarget.label} comes back as a ZIP archive containing one
                image per page.
              </p>
            ) : null}

            {unreachable !== null ? <p className="notice">{unreachable}</p> : null}

            {busy && phase.name === "converting" ? (
              <ProgressMeter
                stage={phase.stage}
                loaded={phase.loaded}
                total={phase.total}
                elapsedMs={elapsedMs}
                onCancel={onCancel}
              />
            ) : (
              <>
                <button
                  type="button"
                  className="btn"
                  onClick={onStart}
                  disabled={!canConvert}
                  aria-describedby="convert-hint"
                >
                  {selectedTarget === null
                    ? "Convert"
                    : `Convert to ${selectedTarget.label}`}
                </button>
                <p className="meta" id="convert-hint" aria-live="polite">
                  {hint}
                </p>
              </>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

/** What is standing between the person and a conversion, in one line. */
function describeBlocker(input: {
  hasFiles: boolean;
  selectedTarget: { label: string } | null;
  health: HealthState;
  canConvert: boolean;
  busy: boolean;
}): string {
  if (input.busy) return "";
  if (input.health === "checking") return "Checking that the converter is ready…";
  if (input.health === "unavailable") return "Conversion is paused until the converter answers.";
  if (input.canConvert) {
    return `Up to ${formatBytes(MAX_UPLOAD_BYTES)} per file. Nothing is saved in this browser.`;
  }
  if (!input.hasFiles) return "Choose a file to convert.";
  if (input.selectedTarget === null) return "Choose an output format.";
  return `Up to ${formatBytes(MAX_UPLOAD_BYTES)} per file. Nothing is saved in this browser.`;
}
