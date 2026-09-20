/**
 * The transport for the `/pdf/*` toolkit.
 *
 * There is no `GET /formats` equivalent for these endpoints — every tool is
 * unconditionally available for any file that is actually a PDF (or, for
 * `scan-to-pdf`, an image), so there is no matrix to probe and no reachability
 * to compute. What is shared with `lib/api.ts` is everything about *how* a
 * request is made and a failure is read: `XMLHttpRequest` for upload progress
 * and cancellation, and the same `{ error: { code, message } }` envelope via
 * `lib/errors.ts`.
 *
 * A tool's response is either a PDF (`application/pdf`) or JSON — never both —
 * so the caller says which it expects and this reads the body accordingly.
 */
import { CLIENT_ABORT_MS } from "./constants";
import {
  type Failure,
  cancelledFailure,
  failureFromResponse,
  networkFailure,
  timedOutFailure,
  unreadableResponseFailure,
} from "./errors";
import { normalizeMediaType } from "./formats";
import { ConversionFailed } from "./api";

export interface PdfPart {
  /** The multipart field name, e.g. `file`, `files`, `images`. */
  name: string;
  value: Blob | string;
  /** The filename for a `Blob` part. Ignored for a string part. */
  filename?: string;
}

export interface PdfProgress {
  loaded: number;
  total: number | null;
}

export interface PdfCallbacks {
  onUploadProgress?: (progress: PdfProgress) => void;
  onUploadComplete?: () => void;
}

export type PdfResponse =
  | { kind: "pdf"; blob: Blob; disposition: string | null; requestId: string | null }
  | { kind: "json"; body: unknown; requestId: string | null };

export interface PdfHandle {
  readonly promise: Promise<PdfResponse>;
  abort: () => void;
}

/**
 * `POST /pdf/{tool}` with an arbitrary set of multipart parts.
 *
 * `expect` decides how a `200` body is read — `"pdf"` as a blob, `"json"` as
 * parsed JSON — because the two response shapes need different `xhr.responseType`
 * values and there is no way to change that once the request is open.
 */
export function postPdfTool(
  path: string,
  parts: readonly PdfPart[],
  expect: "pdf" | "json",
  callbacks: PdfCallbacks = {},
  /**
   * The exact `Content-Type` a `200` must carry when `expect` is `"pdf"`.
   *
   * Named for the common case — every tool but `/pdf/split` answers with
   * `application/pdf` — but `/pdf/split` always answers with `application/zip`
   * (an archive of parts, even for a single part), so this is a parameter
   * rather than a literal.
   */
  expectedMediaType = "application/pdf",
): PdfHandle {
  const xhr = new XMLHttpRequest();
  let settled = false;
  let timedOut = false;
  let uploadReportedComplete = false;

  const promise = new Promise<PdfResponse>((resolve, reject) => {
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
    }, CLIENT_ABORT_MS);

    xhr.upload.onprogress = (event: ProgressEvent): void => {
      if (!(event.lengthComputable || event.total > 0)) {
        callbacks.onUploadProgress?.({ loaded: 0, total: null });
        return;
      }
      callbacks.onUploadProgress?.({ loaded: event.loaded, total: event.total });
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
      const contentType = normalizeMediaType(xhr.getResponseHeader("Content-Type"));

      if (status >= 200 && status < 300) {
        if (expect === "pdf") {
          if (contentType !== expectedMediaType) {
            reject(new ConversionFailed(unreadableResponseFailure(status, requestId)));
            return;
          }
          const blob = xhr.response instanceof Blob ? xhr.response : new Blob([xhr.response as BlobPart]);
          resolve({
            kind: "pdf",
            blob,
            disposition: xhr.getResponseHeader("Content-Disposition"),
            requestId,
          });
          return;
        }

        try {
          const body = JSON.parse(xhr.responseText) as unknown;
          resolve({ kind: "json", body, requestId });
        } catch {
          reject(new ConversionFailed(unreadableResponseFailure(status, requestId)));
        }
        return;
      }

      const bodyText = expect === "pdf" && xhr.response instanceof Blob
        ? xhr.response.text()
        : Promise.resolve(xhr.responseText ?? "");

      void bodyText.then((body) => {
        reject(new ConversionFailed(failureFromResponse(status, body, requestId)));
      });
    };

    xhr.open("POST", apiPdfUrl(path), true);
    xhr.responseType = expect === "pdf" ? "blob" : "text";
    xhr.timeout = 0;

    const body = new FormData();
    for (const part of parts) {
      if (typeof part.value === "string") {
        body.append(part.name, part.value);
      } else {
        body.append(part.name, part.value, part.filename ?? "file");
      }
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

function apiPdfUrl(path: string): string {
  const configured = process.env.NEXT_PUBLIC_CONVERTER_BASE_URL ?? "";
  return `${configured.trim().replace(/\/+$/, "")}${path}`;
}

/** Reads the uniform `{ error: { message } }` shape off a JSON failure body. */
export function failureFromPdfError(error: unknown): Failure {
  if (error instanceof ConversionFailed) return error.failure;
  return networkFailure();
}
