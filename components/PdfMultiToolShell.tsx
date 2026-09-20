"use client";

/**
 * `PdfToolShell`'s sibling for the two `/pdf/*` tools that take several files
 * in a meaningful order — `merge` and `scan-to-pdf`. The list of chosen files
 * replaces the single "chosen file" row, with a way to drop one and to move
 * one up or down, since the order is the whole point of both tools.
 */
import { DropZone } from "@/components/DropZone";
import { ErrorNote } from "@/components/ErrorNote";
import { CheckIcon, DownloadIcon } from "@/components/Icons";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { recoveryFor } from "@/lib/errors";
import { formatBytes, formatDuration } from "@/lib/format";
import type { PdfMultiFileTool } from "@/lib/usePdfMultiFileTool";

export interface PdfMultiToolShellProps {
  tool: PdfMultiFileTool;
  accept: string;
  acceptedLabel: string;
  /** Shown under "Choose files" — what each file must be, and the minimum count. */
  hint: string;
  children?: React.ReactNode;
  onRun: () => void;
}

export function PdfMultiToolShell({
  tool,
  accept,
  acceptedLabel,
  hint,
  children,
  onRun,
}: PdfMultiToolShellProps): React.ReactElement {
  const { phase } = tool;

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
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="step-heading">
          <span className="step-number">1</span> Choose files
        </h2>
        <p className="meta">{hint}</p>

        {tool.files.length > 0 ? (
          <ol className="flex flex-col gap-2">
            {tool.files.map((file, index) => (
              <li key={`${file.name}-${index}`} className="chosen-file">
                <span className="file-name">
                  {index + 1}. {file.name}
                </span>
                <span className="meta">{formatBytes(file.size)}</span>
                <button
                  type="button"
                  className="btn-quiet"
                  onClick={() => tool.moveFile(index, -1)}
                  disabled={phase.name === "running" || index === 0}
                >
                  Move up
                </button>
                <button
                  type="button"
                  className="btn-quiet"
                  onClick={() => tool.moveFile(index, 1)}
                  disabled={phase.name === "running" || index === tool.files.length - 1}
                >
                  Move down
                </button>
                <button
                  type="button"
                  className="btn-quiet"
                  onClick={() => tool.removeFile(index)}
                  disabled={phase.name === "running"}
                >
                  Remove
                </button>
              </li>
            ))}
          </ol>
        ) : null}

        <DropZone
          id="pdf-multi-tool-file"
          accept={accept}
          acceptedLabel={acceptedLabel}
          limitLabel={formatBytes(MAX_UPLOAD_BYTES)}
          disabled={phase.name === "running"}
          onSelect={(file) => tool.addFiles([file])}
          multiple
        />
      </section>

      {tool.files.length > 0 && children ? (
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

        <button type="button" className="btn" onClick={onRun} disabled={!tool.canRun}>
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
          cooldownRemainingMs={0}
          onAction={tool.reset}
        />
      ) : null}
    </div>
  );
}
