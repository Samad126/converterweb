"use client";

/**
 * The run → result flow for one `/audio/*`, `/video/*` or YouTube page — the
 * part every media page shares, whatever it was given to convert.
 *
 * Step one is the caller's: a file drop zone for an upload, a link field for a
 * YouTube video. Everything from the button down is this component, so a
 * result, a failure and a service that is not answering look the same on
 * every media page, and a page cannot drift from the others by accident.
 */
import type { ReactNode } from "react";

import { ErrorNote } from "@/components/ui/ErrorNote";
import { HealthNote } from "@/components/converter/HealthNote";
import { CheckIcon, DownloadIcon } from "@/components/ui/Icons";
import { type Failure, type Recovery, recoveryFor } from "@/lib/api/errors";
import { formatBytes, formatDuration } from "@/lib/format";
import type { MediaRun } from "@/lib/media/useMediaJob";
import { useServiceHealth } from "@/lib/converter/useServiceHealth";

export interface MediaToolShellProps {
  /** What this page is showing, and whether Convert may be pressed for the input it holds. */
  tool: MediaRun & { canRun: boolean };
  onRun: () => void;
  /** The one action a failure offers. The file rules, unless a page knows better. */
  recoveryOf?: (failure: Failure) => Recovery;
  /** Step one: the page's own input. */
  children: ReactNode;
}

export function MediaToolShell({ tool, onRun, recoveryOf = recoveryFor, children }: MediaToolShellProps): React.ReactElement {
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

  const runnable = tool.canRun && health === "ready";

  return (
    <>
      {health === "unavailable" && healthFailure !== null ? (
        <HealthNote failure={healthFailure} onRetry={recheckHealth} />
      ) : null}

      {/*
       * A form so that Enter in a text field runs the conversion, as it does
       * in every other form on the site. The button is the same gate either
       * way: a disabled submit button does not submit, so Enter cannot start a
       * run the button would refuse.
       */}
      <form
        className="flex flex-col gap-8"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (runnable) onRun();
        }}
      >
        {children}

        <section className="flex flex-col gap-3">
          <h2 className="step-heading">
            <span className="step-number">2</span> Convert
          </h2>

          <button type="submit" className="btn" disabled={!runnable}>
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
          <ErrorNote failure={phase.failure} recovery={recoveryOf(phase.failure)} onAction={tool.reset} />
        ) : null}
      </form>
    </>
  );
}
