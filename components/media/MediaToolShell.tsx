"use client";

/**
 * The upload → run → result flow for one `/audio/*` or `/video/*` page —
 * `components/pdf/PdfToolShell.tsx`'s media cousin. Not the same component,
 * because that one hardcodes `.pdf` and the 25 MB document limit into its
 * `DropZone`; this tool accepts one media extension at a time and a 500 MB
 * limit, so those have to be props instead of constants.
 */
import { DropZone } from "@/components/ui/DropZone";
import { ErrorNote } from "@/components/ui/ErrorNote";
import { HealthNote } from "@/components/converter/HealthNote";
import { CheckIcon, DownloadIcon } from "@/components/ui/Icons";
import { recoveryFor } from "@/lib/api/errors";
import { formatBytes, formatDuration } from "@/lib/format";
import type { PdfFileTool } from "@/lib/pdf/usePdfFileTool";
import { useServiceHealth } from "@/lib/converter/useServiceHealth";

const MEDIA_MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export interface MediaToolShellProps {
  tool: PdfFileTool;
  /** The single extension this page accepts, dot-prefixed: `.mp3`. */
  acceptedExtension: string;
  onRun: () => void;
}

export function MediaToolShell({ tool, acceptedExtension, onRun }: MediaToolShellProps): React.ReactElement {
  const { phase } = tool;
  const { health, healthFailure, recheckHealth } = useServiceHealth();

  if (phase.name === "done") {
    return (
      <section className="panel-strong" aria-labelledby="media-result-heading">
        <span className="chip-inverse">
          <CheckIcon size={12} />
          <span className="eyebrow">Done</span>
        </span>
        <h2 id="media-result-heading" className="file-name text-xl font-bold tracking-tight mt-4">
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
            <span className="step-number">1</span> Choose a {acceptedExtension} file
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
              id="media-tool-file"
              accept={acceptedExtension}
              acceptedLabel={acceptedExtension}
              limitLabel={formatBytes(MEDIA_MAX_UPLOAD_BYTES)}
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

        <section className="flex flex-col gap-3">
          <h2 className="step-heading">
            <span className="step-number">2</span> Convert
          </h2>

          <button
            type="button"
            className="btn"
            onClick={onRun}
            disabled={!tool.canRun || health !== "ready"}
          >
            {phase.name === "running"
              ? phase.stage === "uploading"
                ? "Uploading…"
                : "Converting…"
              : "Convert"}
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
