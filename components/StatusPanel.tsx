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
 */
import { useCallback } from "react";

import type { FormatsResponse, SourceFormat, TargetId } from "@/lib/contract";
import { recoveryFor, type Failure, type Recovery } from "@/lib/errors";
import { formatBytes } from "@/lib/format";
import { acceptAttribute, acceptedExtensions, findTarget } from "@/lib/formats";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import type { HealthState, Phase } from "@/lib/useConverter";

import { DropZone } from "./DropZone";
import { ErrorNote } from "./ErrorNote";
import { FileIcon } from "./Icons";
import { FormatPicker } from "./FormatPicker";
import { ProgressMeter } from "./ProgressMeter";
import { ResultCard } from "./ResultCard";

/** The file input's id, so a "choose a different file" action can focus it. */
export const FILE_INPUT_ID = "converter-file";

export interface StatusPanelProps {
  formats: FormatsResponse;
  source: SourceFormat | null;
  file: File | null;
  targetId: TargetId | null;
  phase: Phase;
  health: HealthState;
  elapsedMs: number;
  cooldownRemainingMs: number;
  canConvert: boolean;
  previewText: string | null;
  isLoadingPreview: boolean;

  onSelectFile: (file: File) => void;
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
    targetId,
    phase,
    health,
    elapsedMs,
    cooldownRemainingMs,
    canConvert,
    previewText,
    isLoadingPreview,
    onSelectFile,
    onClearFile,
    onSelectTarget,
    onStart,
    onCancel,
    onReset,
    onChooseAnotherFormat,
    onLoadPreview,
  } = props;

  const selectedTarget = targetId === null ? null : findTarget(formats, targetId);

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
          onChooseAnotherFormat();
          return;
        case "start-over":
          onReset();
          return;
        default:
          onStart();
      }
    },
    [focusFileInput, onChooseAnotherFormat, onReset, onStart],
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

  const hint = describeBlocker({ file, selectedTarget, health, canConvert, busy });

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

            {file === null ? (
              <DropZone
                id={FILE_INPUT_ID}
                accept={acceptAttribute(formats)}
                acceptedLabel={acceptedExtensions(formats).join(", ")}
                limitLabel={formatBytes(MAX_UPLOAD_BYTES)}
                disabled={busy}
                onSelect={onSelectFile}
              />
            ) : (
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
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="step-heading">
              <span className="step-number">2</span>{" "}
              Choose an output format
            </h2>

            <FormatPicker
              name="target"
              formats={formats}
              source={source}
              selected={targetId}
              inert={busy}
              onSelect={onSelectTarget}
            />

            {selectedTarget?.multiple ? (
              <p className="meta">
                {selectedTarget.label} comes back as a ZIP archive containing one
                image per page.
              </p>
            ) : null}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="step-heading">
              <span className="step-number">3</span>{" "}
              Convert
            </h2>

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
  file: File | null;
  selectedTarget: { label: string } | null;
  health: HealthState;
  canConvert: boolean;
  busy: boolean;
}): string {
  if (input.busy) return "";
  if (input.health === "checking") return "Checking that the converter is ready…";
  if (input.health === "unavailable") return "Conversion is paused until the converter answers.";
  if (input.canConvert) {
    return "Up to 25 MB. Nothing is saved in this browser.";
  }
  if (input.file === null) return "Choose a file to convert.";
  if (input.selectedTarget === null) return "Choose an output format.";
  return "Up to 25 MB. Nothing is saved in this browser.";
}
