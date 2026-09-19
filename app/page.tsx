"use client";

/**
 * One page, one job: pick a file, pick an output format, get the converted file
 * back.
 *
 * All of the state lives in `useConverter`; this file is the shell around it —
 * the heading, the branches for "we do not have a matrix yet", the health note,
 * and the footer. Keeping it that thin is what makes the four conversion states
 * one screen each rather than four overlapping ones.
 */
import { ErrorNote } from "@/components/ErrorNote";
import { HealthNote } from "@/components/HealthNote";
import { StatusPanel } from "@/components/StatusPanel";
import type { Failure } from "@/lib/errors";
import { useConverter } from "@/lib/useConverter";

export default function Page(): React.ReactElement {
  const converter = useConverter();

  return (
    <main className="mx-auto w-full max-w-[640px] px-5 py-10 sm:py-14">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">File converter</h1>
        <p className="mt-3 text-base muted max-w-[46ch]">
          Convert a document, spreadsheet, presentation or image. Choose a file
          and a format; the converted file comes straight back.
        </p>
      </header>

      <hr className="hairline my-8" />

      {converter.health === "unavailable" && converter.healthFailure !== null ? (
        <HealthNote
          failure={converter.healthFailure}
          onRetry={converter.recheckHealth}
        />
      ) : null}

      {converter.formats === null ? (
        <FormatMatrixPlaceholder
          isLoading={converter.isLoadingFormats}
          failure={converter.formatsFailure}
          onRetry={converter.reloadFormats}
        />
      ) : (
        <StatusPanel
          formats={converter.formats}
          source={converter.source}
          file={converter.file}
          targetId={converter.targetId}
          phase={converter.phase}
          health={converter.health}
          elapsedMs={converter.elapsedMs}
          cooldownRemainingMs={converter.cooldownRemainingMs}
          canConvert={converter.canConvert}
          previewText={converter.previewText}
          isLoadingPreview={converter.isLoadingPreview}
          onSelectFile={converter.selectFile}
          onClearFile={converter.clearFile}
          onSelectTarget={converter.selectTarget}
          onStart={converter.start}
          onCancel={converter.cancel}
          onReset={converter.reset}
          onChooseAnotherFormat={converter.chooseAnotherFormat}
          onLoadPreview={converter.loadPreview}
        />
      )}

      <hr className="hairline my-8" />

      <footer>
        <p className="meta">
          Files up to 25 MB. A conversion that takes longer than 90 seconds is
          stopped by the server; this page gives up at 120 seconds. Nothing is
          saved in this browser.
        </p>
      </footer>
    </main>
  );
}

/**
 * The matrix is the only thing the page cannot draw without.
 *
 * The placeholder reserves the same height as the picker it is standing in for,
 * so that loading the matrix does not move the button under it — the layout is
 * the same shape while it is empty, full and failed.
 */
function FormatMatrixPlaceholder({
  isLoading,
  failure,
  onRetry,
}: {
  isLoading: boolean;
  failure: Failure | null;
  onRetry: () => void;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-8" aria-busy={isLoading}>
      <section className="flex flex-col gap-3">
        <h2 className="step-heading">
          <span className="step-number">1</span>{" "}
          Choose a file
        </h2>
        <div className="skeleton skeleton-dropzone" aria-hidden="true" />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="step-heading">
          <span className="step-number">2</span>{" "}
          Choose an output format
        </h2>
        <div className="picker-region" aria-hidden="true">
          <div className="picker">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="skeleton-chip" />
            ))}
          </div>
        </div>
      </section>

      {failure !== null ? (
        <ErrorNote
          failure={failure}
          recovery="retry"
          cooldownRemainingMs={0}
          onAction={onRetry}
        />
      ) : (
        <p className="meta" role="status" aria-live="polite">
          {isLoading ? "Loading the format list…" : ""}
        </p>
      )}
    </div>
  );
}
