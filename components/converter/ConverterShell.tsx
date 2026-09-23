"use client";

/**
 * The converter itself, with no page around it.
 *
 * This is everything `app/page.tsx` used to be, minus the heading, the `<main>`
 * and the footer — so that every conversion page renders one implementation of
 * the four conversion states rather than sixty-seven that drift.
 *
 * The two props are what a conversion page says about itself, and both are
 * narrowing rather than preference:
 *
 *   - `lockedTargetId` fixes the output format and removes the picker. A page
 *     called "Word to PDF" that offers thirteen other formats is not about Word
 *     to PDF; the links to the sibling pages are a better answer for somebody
 *     who wanted a different one.
 *   - `acceptedExtensions` fixes the input. Without it a PNG dropped on the Word
 *     page would convert happily, because the *service* accepts PNGs — true, but
 *     not what the page said it would do.
 *
 * Neither can make the page lie. If the live matrix stops supporting the
 * conversion, `canConvert` refuses and the panel shows the server's own reason;
 * a stale page degrades to an explanation rather than to a broken button.
 *
 * Left unset, both default to the whole service, and this renders the universal
 * tool it always was.
 */
import { ErrorNote } from "@/components/ui/ErrorNote";
import { HealthNote } from "@/components/converter/HealthNote";
import { StatusPanel } from "@/components/converter/StatusPanel";
import type { TargetId } from "@/lib/api/contract";
import type { Failure } from "@/lib/api/errors";
import { useConverter } from "@/lib/converter/useConverter";

export interface ConverterShellProps {
  /** The one format this page produces. Omit for the universal tool. */
  lockedTargetId?: TargetId;
  /** The extensions this page accepts. Omit for every extension the service takes. */
  acceptedExtensions?: readonly string[];
}

export function ConverterShell({
  lockedTargetId,
  acceptedExtensions,
}: ConverterShellProps): React.ReactElement {
  const converter = useConverter(
    lockedTargetId === undefined && acceptedExtensions === undefined
      ? undefined
      : { lockedTargetId, acceptedExtensions },
  );

  const locked = converter.lockedTargetId !== null;

  return (
    <>
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
          locked={locked}
        />
      ) : (
        <StatusPanel
          formats={converter.formats}
          source={converter.source}
          file={converter.file}
          files={converter.files}
          fileErrors={converter.fileErrors}
          targetId={converter.targetId}
          phase={converter.phase}
          health={converter.health}
          elapsedMs={converter.elapsedMs}
          cooldownRemainingMs={converter.cooldownRemainingMs}
          canConvert={converter.canConvert}
          previewText={converter.previewText}
          isLoadingPreview={converter.isLoadingPreview}
          lockedTargetId={converter.lockedTargetId}
          acceptedExtensions={converter.acceptedExtensions}
          acceptAttribute={converter.acceptAttribute}
          maxFiles={converter.maxFiles}
          maxTotalBytes={converter.maxTotalBytes}
          onSelectFile={converter.selectFile}
          onAddFiles={converter.addFiles}
          onRemoveFile={converter.removeFile}
          onClearFile={converter.clearFile}
          onSelectTarget={converter.selectTarget}
          onStart={converter.start}
          onCancel={converter.cancel}
          onReset={converter.reset}
          onChooseAnotherFormat={converter.chooseAnotherFormat}
          onLoadPreview={converter.loadPreview}
        />
      )}
    </>
  );
}

/**
 * The matrix is the only thing the converter cannot draw without.
 *
 * The placeholder reserves the same height as the picker it is standing in for,
 * so that loading the matrix does not move the button under it — the layout is
 * the same shape while it is empty, full and failed.
 *
 * A locked page has no picker, so it reserves nothing for one: a skeleton of a
 * control that is never going to arrive would be a lie about the page that is
 * about to render.
 */
function FormatMatrixPlaceholder({
  isLoading,
  failure,
  onRetry,
  locked,
}: {
  isLoading: boolean;
  failure: Failure | null;
  onRetry: () => void;
  locked: boolean;
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

      {locked ? null : (
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
      )}

      <section className="flex flex-col gap-3">
        <h2 className="step-heading">
          <span className="step-number">{locked ? 2 : 3}</span> Convert
        </h2>
        <div className="skeleton skeleton-button" aria-hidden="true" />
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
