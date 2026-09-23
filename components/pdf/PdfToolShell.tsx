"use client";

/**
 * The upload → run → result flow shared by the single-PDF-in/PDF-out tools in
 * `/pdf/*`. The counterpart to `ConverterShell`, minus the format matrix and
 * the target picker — a `/pdf/*` tool has neither, since every tool works on
 * any PDF unconditionally rather than on a reachable subset of formats.
 *
 * `children` is a render prop for the tool's own options (OCR's `force`
 * toggle, Compress's `level` radio) — each tool owns its own fields and hands
 * them to `onRun` as extra multipart parts, so this component never has to
 * know what any particular tool asks for.
 */
import { DropZone } from "@/components/ui/DropZone";
import { ErrorNote } from "@/components/ui/ErrorNote";
import { HealthNote } from "@/components/converter/HealthNote";
import { CheckIcon, DownloadIcon } from "@/components/ui/Icons";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { recoveryFor } from "@/lib/api/errors";
import { formatBytes, formatDuration } from "@/lib/format";
import type { PdfFileTool } from "@/lib/pdf/usePdfFileTool";
import { useServiceHealth } from "@/lib/converter/useServiceHealth";

export interface PdfToolShellProps {
  tool: PdfFileTool;
  /** The tool's own option controls, shown once a file is chosen. */
  children?: React.ReactNode;
  /** Called with the extra fields this tool wants when the button is pressed. */
  onRun: () => void;
  /**
   * Disable Run for a reason only the tool's own fields know about — e.g.
   * `/pdf/sign` and `/pdf/edit` need every placed element to be complete,
   * `/pdf/redact` needs at least one area. `tool.canRun` only knows about
   * the file and the request's own in-flight state, so without this a tool
   * with nothing configured could still submit an empty elements/areas
   * array and have the server reject it.
   */
  runDisabled?: boolean;
}

export function PdfToolShell({ tool, children, onRun, runDisabled = false }: PdfToolShellProps): React.ReactElement {
  const { phase } = tool;
  const { health, healthFailure, recheckHealth } = useServiceHealth();

  if (phase.name === "done") {
    return (
      <section className="panel-strong" aria-labelledby="pdf-result-heading">
        <span className="chip-inverse">
          <CheckIcon size={12} />
          <span className="eyebrow">Done</span>
        </span>
        <h2 id="pdf-result-heading" className="file-name text-xl font-bold tracking-tight mt-4">
          {phase.result.filename}
        </h2>
        <p className="meta mt-2">{formatBytes(phase.result.byteSize)}</p>
        <a className="btn btn-inverse mt-5" href={phase.result.downloadUrl} download={phase.result.filename}>
          <DownloadIcon size={18} />
          Download
        </a>
        <div className="mt-3">
          <button type="button" className="btn-quiet" onClick={tool.reset}>
            Start over
          </button>
        </div>
      </section>
    );
  }

  return (
    <>
      {health === "unavailable" && healthFailure !== null ? (
        <HealthNote failure={healthFailure} onRetry={recheckHealth} />
      ) : null}

      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <h2 className="step-heading">
            <span className="step-number">1</span> Choose a PDF
          </h2>

          {tool.file ? (
            <div className="chosen-file">
              <span className="file-name">{tool.file.name}</span>
              <span className="meta">{formatBytes(tool.file.size)}</span>
              <button
                type="button"
                className="btn-quiet"
                onClick={tool.clearFile}
                disabled={phase.name === "running"}
              >
                Remove
              </button>
            </div>
          ) : (
            <DropZone
              id="pdf-tool-file"
              accept=".pdf"
              acceptedLabel=".pdf"
              limitLabel={formatBytes(MAX_UPLOAD_BYTES)}
              disabled={phase.name === "running"}
              onSelect={tool.selectFile}
            />
          )}

          {tool.fileError ? (
            <ul className="flex flex-col gap-1" role="alert">
              <li className="notice">{tool.fileError}</li>
            </ul>
          ) : null}
        </section>

        {tool.file && children ? (
          <section className="flex flex-col gap-3">
            <h2 className="step-heading">
              <span className="step-number">2</span> Options
            </h2>
            {children}
          </section>
        ) : null}

        <section className="flex flex-col gap-3">
          <h2 className="step-heading">
            <span className="step-number">{children ? 3 : 2}</span> Run
          </h2>

          <button
            type="button"
            className="btn"
            onClick={onRun}
            disabled={!tool.canRun || health !== "ready" || runDisabled}
          >
            {phase.name === "running"
              ? phase.stage === "uploading"
                ? "Uploading…"
                : "Working…"
              : "Run"}
          </button>

          {phase.name === "running" ? (
            <p className="meta" role="status" aria-live="polite">
              {formatDuration(tool.elapsedMs)} elapsed
              <button type="button" className="btn-quiet ml-3" onClick={tool.cancel}>
                Cancel
              </button>
            </p>
          ) : null}
        </section>

        {phase.name === "failed" ? (
          <ErrorNote
            failure={phase.failure}
            recovery={recoveryFor(phase.failure)}
            onAction={tool.reset}
          />
        ) : null}
      </div>
    </>
  );
}
