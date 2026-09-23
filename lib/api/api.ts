/**
 * The three calls this app makes, and nothing else.
 *
 * The browser talks to the converter directly. There is no Next route handler
 * in front of it, on purpose: a handler would add its own timeout to a budget
 * that is already 120 seconds, and it would hold a second copy of a 100 MiB
 * upload in memory while streaming it through. The base URL is
 * `NEXT_PUBLIC_CONVERTER_BASE_URL`, defaulting to same-origin — which is how
 * this is deployed, with the reverse proxy serving both the page and the API.
 *
 * `convert` uses `XMLHttpRequest` rather than `fetch`, for two things `fetch`
 * cannot do: report upload progress (`upload.onprogress`) and be cancelled
 * mid-flight (`xhr.abort()`). Those are not niceties here — a 100 MiB upload
 * over a phone connection without a progress bar is indistinguishable from a
 * hung page, and a conversion that has already run for two minutes with no way
 * to stop it is worse.
 */
import { CLIENT_ABORT_MS, UPLOAD_PART_NAME, UPLOAD_PART_TYPE } from "../constants";
import type { FormatsResponse, HealthResponse } from "./contract";
import {
  type Failure,
  cancelledFailure,
  failureFromResponse,
  networkFailure,
  timedOutFailure,
  unreadableResponseFailure,
} from "./errors";
import { normalizeMediaType } from "../converter/formats";

/** A failure with an HTTP status or a network cause behind it. */
export class ConversionFailed extends Error {
  readonly failure: Failure;

  constructor(failure: Failure) {
    super(failure.message);
    this.name = "ConversionFailed";
    this.failure = failure;
  }
}

/**
 * Where the API lives.
 *
 * Empty by default, which makes every URL relative and therefore same-origin.
 * Set `NEXT_PUBLIC_CONVERTER_BASE_URL` only when the API is served from
 * somewhere else — and note that a cross-origin deployment also has to expose
 * `X-Request-Id` (the header is not visible to JavaScript otherwise) and to
 * allow the origin in its CORS policy.
 */
export function apiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_CONVERTER_BASE_URL ?? "";
  return configured.trim().replace(/\/+$/, "");
}

/** Absolute for a configured base, relative for same-origin. */
export function apiUrl(path: string): string {
  return `${apiBaseUrl()}${path}`;
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

/**
 * A JSON `GET`, with every failure normalised into a `Failure`.
 *
 * `Accept: application/json` is not decoration: the bare catch-all of a
 * misconfigured server is an HTML page, and asking for JSON is what makes a
 * proxy answer with an error instead of a document we cannot read.
 */
async function requestJson(path: string, signal?: AbortSignal): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method: "GET",
      headers: { Accept: "application/json" },
      // The matrix is a handful of bytes and the only thing worse than fetching
      // it every time is showing a user a format list the server has outgrown.
      cache: "no-store",
      ...(signal ? { signal } : {}),
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ConversionFailed(networkFailure());
  }

  const requestId = response.headers.get("X-Request-Id");
  const body = await response.text();

  if (!response.ok) {
    throw new ConversionFailed(failureFromResponse(response.status, body, requestId));
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new ConversionFailed(unreadableResponseFailure(response.status, requestId));
  }
}

/**
 * `GET /formats` — the conversion matrix.
 *
 * Throws `ConversionFailed` on anything other than a readable matrix. A
 * non-2xx shows the server's own sentence: `/formats` has an envelope like
 * every other endpoint, and there is no reason to replace it with ours.
 */
export async function fetchFormats(signal?: AbortSignal): Promise<FormatsResponse> {
  const body = await withRetry(() => requestJson("/formats", signal), signal);
  return assertFormats(body);
}

const RETRY_DELAYS_MS = [500, 1500];

/**
 * Retries an idempotent GET on a dropped connection or a gateway error.
 *
 * Only for the matrix: `/health` exists to report "not ready" and must not
 * hide it, and an upload is never retried on the person's behalf.
 */
async function withRetry<T>(attempt: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await attempt();
    } catch (error) {
      const transient =
        error instanceof ConversionFailed &&
        (error.failure.kind === "network" ||
          (error.failure.kind === "http" && [502, 503, 504].includes(error.failure.status)));
      const delay = RETRY_DELAYS_MS[i];
      if (!transient || delay === undefined || signal?.aborted) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Checks that the body really is a matrix, down to the fields the app reads.
 *
 * The alternative is for every consumer to guard against `undefined.extension`
 * forever. This is the boundary; past it the types mean something. Values are
 * checked by type, not against enums: a server that grows a new target or
 * family must not make an older client reject the whole matrix.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSource(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.extension === "string" &&
    typeof value.mediaType === "string" &&
    Array.isArray(value.targets) &&
    value.targets.every((t) => typeof t === "string")
  );
}

function isTarget(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.extension === "string" &&
    typeof value.mediaType === "string" &&
    typeof value.label === "string" &&
    typeof value.multiple === "boolean"
  );
}

function assertFormats(body: unknown): FormatsResponse {
  if (
    !isRecord(body) ||
    !Array.isArray(body.sources) ||
    !Array.isArray(body.targets) ||
    !body.sources.every(isSource) ||
    !body.targets.every(isTarget)
  ) {
    throw new ConversionFailed(unreadableResponseFailure(200, null));
  }
  return body as unknown as FormatsResponse;
}

export type HealthResult = { ok: true } | { ok: false; failure: Failure };

/**
 * `GET /health` — whether the service is ready to convert.
 *
 * Never throws: "not ready" is a state the page renders, not an error it
 * catches. Reaching this endpoint at all means the whole pipeline is warm, so
 * anything other than `{"status":"ok"}` means conversion stays disabled.
 */
export async function checkHealth(signal?: AbortSignal): Promise<HealthResult> {
  try {
    const body = (await requestJson("/health", signal)) as HealthResponse | null;
    if (
      typeof body === "object" &&
      body !== null &&
      (body as { status?: unknown }).status === "ok"
    ) {
      return { ok: true };
    }
    return { ok: false, failure: unreadableResponseFailure(200, null) };
  } catch (error) {
    if (isAbortError(error)) throw error;
    if (error instanceof ConversionFailed) return { ok: false, failure: error.failure };
    return { ok: false, failure: networkFailure() };
  }
}

export interface ConvertProgress {
  loaded: number;
  /** `null` when the browser cannot compute a total, which makes the phase indeterminate. */
  total: number | null;
}

export interface ConvertResult {
  blob: Blob;
  /** The response's `Content-Type`, lower-cased and stripped of parameters. */
  mediaType: string;
  /** The raw `Content-Disposition` header, to be parsed by the caller. */
  disposition: string | null;
  requestId: string | null;
}

export interface ConvertCallbacks {
  onUploadProgress?: (progress: ConvertProgress) => void;
  /** The body is on the wire. From here the wait is the server's, not the network's. */
  onUploadComplete?: () => void;
}

export interface ConvertHandle {
  readonly promise: Promise<ConvertResult>;
  /** Cancel the request. The promise rejects with a `cancelled` failure. */
  abort: () => void;
}

/**
 * `POST /convert/{target}` with one or more parts, all named `files`.
 *
 * Each part is sent as `application/octet-stream` whatever the file claims to
 * be, because the server picks its import filter from the filename extension
 * and ignores the declared type entirely. The original filename goes along as
 * the third argument to `append` — the extension in it is the whole mechanism.
 *
 * The caller checks the returned `mediaType`: this function reports what came
 * back, and refuses to decide whether it was the right thing to have come
 * back. With a single file that is the target's own type (or a ZIP, for a
 * `multiple` target); with two or more it is always `application/zip`,
 * regardless of target — see `UPLOAD_PART_NAME`.
 */
export function convert(
  target: string,
  files: readonly File[],
  callbacks: ConvertCallbacks = {},
): ConvertHandle {
  const xhr = new XMLHttpRequest();
  let settled = false;
  let timedOut = false;
  let uploadReportedComplete = false;

  const promise = new Promise<ConvertResult>((resolve, reject) => {
    const finish = (settle: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      settle();
    };

    const reportUploadComplete = (): void => {
      if (uploadReportedComplete) return;
      uploadReportedComplete = true;
      callbacks.onUploadComplete?.();
    };

    // Our own deadline, kept on a timer we control rather than on `xhr.timeout`
    // so that a deliberate Cancel and a timeout stay distinguishable.
    const timer = setTimeout(() => {
      timedOut = true;
      xhr.abort();
    }, CLIENT_ABORT_MS);

    xhr.upload.onprogress = (event: ProgressEvent): void => {
      if (!lengthComputable(event)) {
        callbacks.onUploadProgress?.({ loaded: 0, total: null });
        return;
      }
      callbacks.onUploadProgress?.({ loaded: event.loaded, total: event.total });
      if (event.total > 0 && event.loaded >= event.total) reportUploadComplete();
    };

    // Three triggers for one transition. `upload.onload` is the correct one and
    // `loadend` always follows it; the readyState check catches a browser (or a
    // test double) that reports neither, because a progress bar stuck at 100%
    // labelled "Uploading" is a lie the user can see.
    xhr.upload.onload = reportUploadComplete;
    xhr.upload.onloadend = reportUploadComplete;
    xhr.onreadystatechange = (): void => {
      if (xhr.readyState >= XMLHttpRequest.HEADERS_RECEIVED) reportUploadComplete();
    };

    xhr.onerror = (): void => finish(() => reject(new ConversionFailed(networkFailure())));

    xhr.onabort = (): void =>
      finish(() =>
        reject(new ConversionFailed(timedOut ? timedOutFailure() : cancelledFailure())),
      );

    // Unreachable while `xhr.timeout` stays 0, and wired anyway so that a
    // browser which decides otherwise cannot turn a timeout into a silent hang.
    xhr.ontimeout = (): void => finish(() => reject(new ConversionFailed(timedOutFailure())));

    xhr.onload = (): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      const status = xhr.status;
      const requestId = xhr.getResponseHeader("X-Request-Id");
      const contentType = xhr.getResponseHeader("Content-Type");

      // Branch on the status before reading anything. A 200 is never an error
      // state, and a non-2xx is never a download — even when its body looks
      // like one.
      if (status >= 200 && status < 300) {
        resolve({
          blob: toBlob(xhr.response),
          mediaType: normalizeMediaType(contentType),
          disposition: xhr.getResponseHeader("Content-Disposition"),
          requestId,
        });
        return;
      }

      void bodyText(xhr.response).then((body) => {
        reject(new ConversionFailed(failureFromResponse(status, body, requestId)));
      });
    };

    xhr.open("POST", apiUrl(`/convert/${encodeURIComponent(target)}`), true);
    xhr.responseType = "blob";
    // 0 means "no client-side timeout", which is the point: the deadline above
    // is ours and it must win, so that a browser default can never fire first
    // and report a timeout we did not decide on.
    xhr.timeout = 0;

    // No request headers are set. An extra header would make this a preflighted
    // CORS request, and there is nothing to say that the multipart body does
    // not already say.
    const body = new FormData();
    for (const file of files) {
      body.append(UPLOAD_PART_NAME, new Blob([file], { type: UPLOAD_PART_TYPE }), file.name);
    }
    xhr.send(body);
  });

  return {
    promise,
    abort: (): void => {
      if (settled) return;
      xhr.abort();
    },
  };
}

/** `lengthComputable` is false for a streamed upload of unknown length. */
function lengthComputable(event: ProgressEvent): boolean {
  return event.lengthComputable || event.total > 0;
}

/** The blob to hand back, defensively built if the browser gave us something else. */
function toBlob(response: unknown): Blob {
  if (response instanceof Blob) return response;
  return new Blob([response as BlobPart]);
}

/** The response body as text, for the envelope. Never rendered raw. */
async function bodyText(response: unknown): Promise<string> {
  if (response instanceof Blob) return response.text();
  if (typeof response === "string") return response;
  return "";
}
