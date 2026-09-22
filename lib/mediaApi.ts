/**
 * The transport for `/media/{target}` — the asynchronous twin of
 * `lib/api.ts`'s `convert`.
 *
 * A real audio/video transcode is not bounded the way a document conversion
 * is, so the server answers `202` the moment the upload is accepted and
 * validated, and the caller polls `GET /media/jobs/{id}` until it says
 * `done` or `failed`, then reads the file from
 * `GET /media/jobs/{id}/download`. `startMediaJob` still uses
 * `XMLHttpRequest`, for the same reason `convert` does: upload progress and
 * mid-flight cancellation.
 */
import { ConversionFailed, apiUrl } from "./api";
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
          const body = JSON.parse(xhr.responseText) as { id?: unknown; status?: unknown };
          if (typeof body.id !== "string" || (body.status !== "queued" && body.status !== "running")) {
            reject(new ConversionFailed(unreadableResponseFailure(status, requestId)));
            return;
          }
          resolve({ id: body.id, status: body.status });
        } catch {
          reject(new ConversionFailed(unreadableResponseFailure(status, requestId)));
        }
        return;
      }

      reject(new ConversionFailed(failureFromResponse(status, xhr.responseText ?? "", requestId)));
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
    return { status: "failed", failure: failureFromResponse(response.status, text, requestId) };
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
      const message =
        typeof body.error === "object" && body.error !== null && "message" in body.error
          ? String((body.error as { message: unknown }).message)
          : unreadableResponseFailure(response.status, requestId).message;
      return {
        status: "failed",
        failure: { kind: "http", status: response.status, message, requestId, code: null },
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
    throw new ConversionFailed(failureFromResponse(response.status, text, requestId));
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
