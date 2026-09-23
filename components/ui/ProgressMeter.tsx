"use client";

/**
 * Two honest phases and one timer.
 *
 * "Uploading" is determinate, because the browser knows how many bytes it has
 * handed to the socket. "Converting" is indeterminate, because the server has
 * said nothing and will say nothing until it is finished — a bar that crept
 * forward during a conversion would be inventing a number. The phase name is
 * the honest part of this component; the bar is decoration on top of it.
 *
 * The timer and the percentage are `aria-hidden`. They change several times a
 * second, and a live region reading them out would be unusable. The phase is
 * announced instead, and `role="progressbar"` carries the real progress to
 * assistive technology without shouting.
 */
import { formatBytes, formatDuration } from "@/lib/format";

export interface ProgressMeterProps {
  stage: "uploading" | "converting";
  loaded: number;
  total: number | null;
  elapsedMs: number;
  onCancel: () => void;
}

export function ProgressMeter({
  stage,
  loaded,
  total,
  elapsedMs,
  onCancel,
}: ProgressMeterProps): React.ReactElement {
  const determinate = stage === "uploading" && total !== null && total > 0;
  const percent = determinate ? Math.min(100, Math.round((loaded / total) * 100)) : null;

  return (
    <div className="flex flex-col gap-3">
      <p aria-live="polite" className="sr-only">
        {stage === "uploading" ? "Uploading" : "Converting"}
      </p>

      <div className="progress">
        <span className="eyebrow">
          {stage === "uploading" ? "Uploading" : "Converting"}
        </span>
        <span className="meta" aria-hidden="true">
          {percent === null ? null : `${percent}% · `}
          {formatDuration(elapsedMs)}
        </span>
      </div>

      <div
        className="meter"
        role="progressbar"
        aria-label={stage === "uploading" ? "Upload progress" : "Conversion progress"}
        {...(percent === null
          ? {}
          : { "aria-valuenow": percent, "aria-valuemin": 0, "aria-valuemax": 100 })}
      >
        <div
          className="meter-fill"
          data-indeterminate={!determinate}
          style={determinate && percent !== null ? { width: `${percent}%` } : undefined}
        />
      </div>

      <p className="meta" aria-hidden="true">
        {stage === "uploading" && total !== null
          ? `${formatBytes(loaded)} of ${formatBytes(total)}`
          : "The server is converting your file. This can take up to a minute."}
      </p>

      <button type="button" className="btn btn-outline" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
