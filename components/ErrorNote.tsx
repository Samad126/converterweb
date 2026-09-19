"use client";

/**
 * The one way this app reports that something went wrong.
 *
 * Severity comes from the 2 px rule and the bold label, never from a hue — the
 * design has no red in it and does not need one. Nothing here rewrites a
 * message: `failure.message` is printed exactly as it arrived, whether it is
 * the server's sentence or one of the four sentences that are ours because
 * there was no server to write one.
 *
 * `error.code` is deliberately absent. It exists on the failure, for logs, and
 * this component is never given it.
 */
import { useCallback, useEffect, useState } from "react";

import type { Failure, Recovery } from "@/lib/errors";
import { formatCountdown } from "@/lib/format";

import { CopyIcon } from "./Icons";

export interface ErrorNoteProps {
  failure: Failure;
  recovery: Recovery;
  /** Milliseconds left on a `429` cooldown; 0 when there is no cooldown. */
  cooldownRemainingMs: number;
  /** The single action this state offers. */
  onAction: () => void;
}

const ACTION_LABEL: Record<Recovery, string> = {
  retry: "Try again",
  "different-file": "Choose a different file",
  "choose-format": "Choose another format",
  "start-over": "Start over",
  // Only ever reached with the button disabled; the label is the countdown.
  cooldown: "Try again",
};

export function ErrorNote({
  failure,
  recovery,
  cooldownRemainingMs,
  onAction,
}: ErrorNoteProps): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const isCoolingDown = cooldownRemainingMs > 0;

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  const copyRequestId = useCallback((): void => {
    const requestId = failure.requestId;
    if (!requestId) return;
    // A clipboard write can be refused — an insecure context, a denied
    // permission. The id stays selectable in the `<code>` either way, so the
    // worst case is that the person selects it by hand.
    void navigator.clipboard
      ?.writeText(requestId)
      .then(() => setCopied(true))
      .catch(() => undefined);
  }, [failure.requestId]);

  return (
    <section className="error" role="alert">
      <span className="error-label">Error</span>
      <p className="error-message">{failure.message}</p>

      {failure.requestId ? (
        <div className="request-id">
          <span>X-Request-Id</span>
          <code>{failure.requestId}</code>
          <button type="button" className="btn-quiet text-xs" onClick={copyRequestId}>
            <CopyIcon size={12} />
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      ) : null}

      <div className="mt-5">
        <button
          type="button"
          className="btn"
          onClick={onAction}
          disabled={isCoolingDown}
        >
          {isCoolingDown
            ? `Try again in ${formatCountdown(cooldownRemainingMs)}`
            : ACTION_LABEL[recovery]}
        </button>
      </div>

      {isCoolingDown ? (
        <p className="meta mt-3">
          The converter is rate limiting this address. Nothing was converted.
        </p>
      ) : null}
    </section>
  );
}
