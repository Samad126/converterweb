/**
 * The one place a failed request becomes something the UI can render.
 *
 * Every non-2xx response goes through `failureFromResponse`, whatever the
 * status, so there is exactly one implementation of the envelope rule and one
 * implementation of the `HTTP <status>` fallback. Statuses differ only in the
 * recovery they offer, which is `recoveryFor` at the bottom of this file.
 *
 * Two rules shape everything here, and both come from the contract:
 *
 *   - `error.message` is shown **verbatim**. It is a complete sentence written
 *     for a person. We do not prefix it, reword it, or shorten it.
 *   - `error.code` is never shown. It is carried on the failure for logs, and
 *     no component in this app is given it.
 */
import type { ErrorCode } from "./contract";

export type FailureKind =
  /** A non-2xx with an HTTP status behind it. */
  | "http"
  /** The request never reached the server, or the connection died. */
  | "network"
  /** Our own 120 s abort fired before the server answered. */
  | "timed-out"
  /** The person pressed Cancel. */
  | "cancelled"
  /** A 200 whose media type was not the one the target promised. */
  | "media-type"
  /** Refused before any request was made: wrong extension, or over the limit. */
  | "rejected";

export interface Failure {
  kind: FailureKind;
  /** The HTTP status, or 0 when there was no response at all. */
  status: number;
  /** Exactly what the user is shown. The server's sentence, or one of ours. */
  message: string;
  /** Present on success and, where the proxy passes it through, on failure. */
  requestId: string | null;
  /**
   * `error.code`, for logs and metrics only.
   *
   * Typed as a plain string rather than `ErrorCode` because the server is free
   * to add a code this build has never heard of, and a client that pretended
   * otherwise would be lying about what it knows. It is deliberately not part
   * of any component's props.
   */
  code: string | null;
}

/** Our sentences, for the cases where there is no server sentence to show. */
export const OUR_MESSAGES = {
  network: "The server could not be reached.",
  timedOut: "The conversion took too long and was cancelled.",
  cancelled: "The conversion was cancelled.",
  mediaType: "The converter returned an unexpected file type.",
  /** A `200` whose body is not the JSON we asked for — an HTML page from a proxy. */
  unreadable: "The converter sent a reply this app could not read.",
} as const;

/** The contract's fallback when the body is missing or is not JSON. */
export function fallbackMessage(status: number): string {
  return `HTTP ${status}`;
}

/**
 * `error.message` out of a response body, or `null` when the body is not the
 * envelope.
 *
 * Deliberately total: a body that is HTML (a reverse proxy's `413` page), an
 * empty string, valid JSON of the wrong shape, or JSON whose message is empty
 * all return `null`, and the caller falls back to `HTTP <status>`. A raw HTML
 * body is never shown.
 */
export function readErrorMessage(body: string): { message: string; code: string | null } | null {
  if (body.trim() === "") return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;

  const envelope = (parsed as { error?: unknown }).error;
  if (typeof envelope !== "object" || envelope === null) return null;

  const { message, code } = envelope as { message?: unknown; code?: unknown };
  if (typeof message !== "string" || message.trim() === "") return null;

  return {
    message,
    code: typeof code === "string" ? code : null,
  };
}

/** Build a failure from a non-2xx response and the body we read off it. */
export function failureFromResponse(
  status: number,
  body: string,
  requestId: string | null,
): Failure {
  const envelope = readErrorMessage(body);

  return {
    kind: "http",
    status,
    message: envelope?.message ?? fallbackMessage(status),
    requestId,
    code: envelope?.code ?? null,
  };
}

export function networkFailure(): Failure {
  return { kind: "network", status: 0, message: OUR_MESSAGES.network, requestId: null, code: null };
}

export function timedOutFailure(): Failure {
  return {
    kind: "timed-out",
    status: 0,
    message: OUR_MESSAGES.timedOut,
    requestId: null,
    code: null,
  };
}

export function cancelledFailure(): Failure {
  return {
    kind: "cancelled",
    status: 0,
    message: OUR_MESSAGES.cancelled,
    requestId: null,
    code: null,
  };
}

/**
 * A `200` whose `Content-Type` is not the target's own.
 *
 * The contract is explicit that this is a client-visible failure and not a
 * download: showing the file would hand someone an HTML error page with a
 * `.pdf` name. We keep the request id, because it is the one thing that makes
 * this reportable.
 */
export function mediaTypeMismatchFailure(requestId: string | null): Failure {
  return {
    kind: "media-type",
    // 200, because that is what came back. The mismatch is a fact about the
    // body, not a status — and a `200` is never treated as an error by the
    // request layer, only by the caller that checked the media type.
    status: 200,
    message: OUR_MESSAGES.mediaType,
    requestId,
    code: null,
  };
}

/**
 * A refusal by this client, before any request was made.
 *
 * The sentence is ours because there is no server sentence — nothing was sent.
 * It is built from `GET /formats` and the contract's limit, so it names the
 * extensions that *would* work rather than just saying no.
 */
export function rejectedFailure(message: string): Failure {
  return { kind: "rejected", status: 0, message, requestId: null, code: null };
}

/**
 * A `200` whose body could not be read as the JSON it was asked for.
 *
 * Not an envelope and not an HTTP error: it is what a misconfigured proxy
 * answers when it serves an HTML page for an API path. The status is available
 * for the log line, but the message has to be ours — `HTTP 200` is a true
 * statement that tells the person nothing.
 */
export function unreadableResponseFailure(status: number, requestId: string | null): Failure {
  return {
    kind: "http",
    status,
    message: OUR_MESSAGES.unreadable,
    requestId,
    code: null,
  };
}

/** What the user can do about a failure. One primary action per state. */
export type Recovery = "retry" | "different-file" | "cooldown" | "choose-format" | "start-over";

/**
 * Status → the single action the failure state offers.
 *
 * `4xx` is never retried automatically; this only decides which button the
 * person is given, and a retry is always theirs to press.
 */
export function recoveryFor(failure: Failure): Recovery {
  // A refusal never reached the server, so there is no status to consult: the
  // only thing that can change the outcome is a different file.
  if (failure.kind === "rejected") return "different-file";

  switch (failure.status) {
    case 404:
      // The target does not exist at all. The matrix we hold is stale, so the
      // honest move is to start again from a fresh `GET /formats`.
      return "start-over";
    case 415:
      // A real target this source cannot reach. The server's sentence names
      // what it can become; the picker is re-rendered from a fresh matrix.
      return "choose-format";
    case 422:
      // Password protected. Retrying the same file can only fail again.
      return "different-file";
    case 429:
      return "cooldown";
    default:
      return "retry";
  }
}

/**
 * Whether a failure state should re-render the format picker.
 *
 * Both of these mean our copy of the matrix disagrees with the server's, and
 * the fix is to look at the server's again rather than to keep guessing.
 */
export function showsFormatPicker(failure: Failure): boolean {
  return failure.status === 404 || failure.status === 415;
}

/** Whether a failure means the matrix should be re-fetched before anything else. */
export function invalidatesMatrix(failure: Failure): boolean {
  return failure.status === 404 || failure.status === 415;
}

/** Re-exported so callers do not have to reach into `lib/api/contract` for a code. */
export type { ErrorCode };
