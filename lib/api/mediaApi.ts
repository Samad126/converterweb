/**
 * The transport for `/media/{target}` — the asynchronous twin of
 * `lib/api/api.ts`'s `convert`.
 *
 * A real audio/video transcode is not bounded the way a document conversion
 * is, so the server answers `202` the moment the upload is accepted and
 * validated, and the caller polls `GET /media/jobs/{id}` until it says
 * `done` or `failed`, then reads the file from
 * `GET /media/jobs/{id}/download`. `startMediaJob` still uses
 * `XMLHttpRequest`, for the same reason `convert` does: upload progress and
 * mid-flight cancellation.
 *
 * `startYouTubeJob` starts the same kind of job from a link instead of an
 * upload, and everything after the `202` is shared with it.
 */
import { ConversionFailed, apiUrl } from "./api";
import type { YouTubeTargetId } from "./contract";
import {
  type Failure,
  cancelledFailure,
  failureFromResponse,
  networkFailure,
  timedOutFailure,
  unreadableResponseFailure,
} from "./errors";

/** How long a single upload+validate request is allowed before we give up on it. */
const START_JOB_TIMEOUT_MS = 120_000;

/** How often the job status is polled. */
export const MEDIA_POLL_INTERVAL_MS = 1_500;

export interface MediaJobStarted {
  id: string;
  status: "queued" | "running";
}

export interface MediaJobStartHandle {
  readonly promise: Promise<MediaJobStarted>;
  abort: () => void;
  onUploadProgress?: (loaded: number, total: number | null) => void;
}

export interface MediaStartCallbacks {
  onUploadProgress?: (loaded: number, total: number | null) => void;
  onUploadComplete?: () => void;
}

/** `POST /media/{target}` with a single file under `files`. */
export function startMediaJob(
  target: string,
  file: File,
  callbacks: MediaStartCallbacks = {},
): MediaJobStartHandle {
  const xhr = new XMLHttpRequest();
  let settled = false;
  let timedOut = false;
  let uploadReportedComplete = false;

  const promise = new Promise<MediaJobStarted>((resolve, reject) => {
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

    const timer = setTimeout(() => {
      timedOut = true;
      xhr.abort();
    }, START_JOB_TIMEOUT_MS);

    xhr.upload.onprogress = (event: ProgressEvent): void => {
      if (!(event.lengthComputable || event.total > 0)) {
        callbacks.onUploadProgress?.(0, null);
        return;
      }
      callbacks.onUploadProgress?.(event.loaded, event.total);
      if (event.total > 0 && event.loaded >= event.total) reportUploadComplete();
    };

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
    xhr.ontimeout = (): void => finish(() => reject(new ConversionFailed(timedOutFailure())));

    xhr.onload = (): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      const status = xhr.status;
      const requestId = xhr.getResponseHeader("X-Request-Id");

      if (status >= 200 && status < 300) {
        try {
          resolve(startedFromBody(status, xhr.responseText, requestId));
        } catch (error) {
          reject(error);
        }
        return;
      }

      reject(new ConversionFailed(failureFromResponse(status, xhr.responseText ?? "", requestId, xhr.getResponseHeader("Retry-After"))));
    };

    xhr.open("POST", apiUrl(`/media/${encodeURIComponent(target)}`), true);
    xhr.responseType = "text";
    xhr.timeout = 0;

    const body = new FormData();
    body.append("files", new Blob([file], { type: "application/octet-stream" }), file.name);
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

/**
 * `POST /youtube/{target}` with the link as JSON.
 *
 * `fetch` rather than the XHR `startMediaJob` uses: there is no upload to
 * report progress on, so the only thing to cancel is the request itself, and
 * `AbortController` covers that. The link is sent as the person pasted it. The
 * service is the one that reduces it to a video id, so there is no second
 * parser here to disagree with it.
 */
export function startYouTubeJob(target: YouTubeTargetId, link: string): MediaJobStartHandle {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, START_JOB_TIMEOUT_MS);

  const promise = (async (): Promise<MediaJobStarted> => {
    try {
      const response = await fetch(apiUrl(`/youtube/${encodeURIComponent(target)}`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ url: link }),
        cache: "no-store",
        signal: controller.signal,
      });

      const requestId = response.headers.get("X-Request-Id");
      const text = await response.text();

      if (!response.ok) {
        throw new ConversionFailed(
          failureFromResponse(response.status, text, requestId, response.headers.get("Retry-After")),
        );
      }
      return startedFromBody(response.status, text, requestId);
    } catch (error) {
      if (error instanceof ConversionFailed) throw error;
      if (!isAbortError(error)) throw new ConversionFailed(networkFailure());
      throw new ConversionFailed(timedOut ? timedOutFailure() : cancelledFailure());
    } finally {
      clearTimeout(timer);
    }
  })();

  return {
    promise,
    abort: (): void => controller.abort(),
  };
}

/**
 * The `202` body both start endpoints answer with, or the one sentence we show
 * when it is not one. Throws rather than returning a failure, so a caller
 * inside a promise can let it reject.
 */
function startedFromBody(status: number, text: string, requestId: string | null): MediaJobStarted {
  try {
    const body = JSON.parse(text) as { id?: unknown; status?: unknown };
    if (typeof body.id === "string" && (body.status === "queued" || body.status === "running")) {
      return { id: body.id, status: body.status };
    }
  } catch {
    // Not JSON at all: the same sentence as a body that parses but is the wrong shape.
  }
  throw new ConversionFailed(unreadableResponseFailure(status, requestId));
}

export type MediaJobStatus =
  | { status: "queued" }
  | { status: "running" }
  | { status: "done"; downloadUrl: string; bytes: number }
  | { status: "failed"; failure: Failure };

/** `GET /media/jobs/{id}` — never throws; a network failure is reported as `failed`. */
export async function fetchMediaJobStatus(id: string, signal?: AbortSignal): Promise<MediaJobStatus> {
  let response: Response;
  try {
    response = await fetch(apiUrl(`/media/jobs/${encodeURIComponent(id)}`), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      ...(signal ? { signal } : {}),
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    return { status: "failed", failure: networkFailure() };
  }

  const requestId = response.headers.get("X-Request-Id");
  const text = await response.text();

  if (!response.ok) {
    return { status: "failed", failure: failureFromResponse(response.status, text, requestId, response.headers.get("Retry-After")) };
  }

  try {
    const body = JSON.parse(text) as {
      status?: unknown;
      downloadUrl?: unknown;
      bytes?: unknown;
      error?: unknown;
    };
    if (body.status === "queued" || body.status === "running") {
      return { status: body.status };
    }
    if (body.status === "done" && typeof body.downloadUrl === "string") {
      return {
        status: "done",
        downloadUrl: body.downloadUrl,
        bytes: typeof body.bytes === "number" ? body.bytes : 0,
      };
    }
    if (body.status === "failed") {
      // The job's own failure: the status endpoint answers `200` for it, so the
      // `error.code` is the only thing that says what went wrong.
      const error = (typeof body.error === "object" && body.error !== null ? body.error : {}) as {
        code?: unknown;
        message?: unknown;
      };
      const message =
        typeof error.message === "string"
          ? error.message
          : unreadableResponseFailure(response.status, requestId).message;
      return {
        status: "failed",
        failure: {
          kind: "http",
          status: response.status,
          message,
          requestId,
          code: typeof error.code === "string" ? error.code : null,
        },
      };
    }
    return { status: "failed", failure: unreadableResponseFailure(response.status, requestId) };
  } catch {
    return { status: "failed", failure: unreadableResponseFailure(response.status, requestId) };
  }
}

export interface MediaDownloadResult {
  blob: Blob;
  mediaType: string;
  disposition: string | null;
}

/** `GET /media/jobs/{id}/download` — only ever called once status is `done`. */
export async function downloadMediaJob(downloadUrl: string, signal?: AbortSignal): Promise<MediaDownloadResult> {
  let response: Response;
  try {
    response = await fetch(apiUrl(downloadUrl), {
      method: "GET",
      cache: "no-store",
      ...(signal ? { signal } : {}),
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ConversionFailed(networkFailure());
  }

  const requestId = response.headers.get("X-Request-Id");
  if (!response.ok) {
    const text = await response.text();
    throw new ConversionFailed(failureFromResponse(response.status, text, requestId, response.headers.get("Retry-After")));
  }

  return {
    blob: await response.blob(),
    mediaType: (response.headers.get("Content-Type") ?? "").split(";")[0]?.trim().toLowerCase() ?? "",
    disposition: response.headers.get("Content-Disposition"),
  };
}

function isAbortError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { name?: unknown }).name === "AbortError";
}
