/**
 * MSW stands in for the server.
 *
 * Two baseline handlers — the matrix and a healthy service — so that a test
 * only has to describe the one thing it is actually about. Everything else is
 * added per test with `server.use`.
 *
 * `onUnhandledRequest: "error"` is set in the setup file, which is how the test
 * that a 26 MB file makes *no request at all* gets to be a real assertion: an
 * unexpected request does not quietly succeed, it fails the test.
 */
import { HttpResponse, http } from "msw";

import type { ErrorCode } from "@/lib/contract";

import { MATRIX } from "./matrix";

/** The base URL the tests configure `NEXT_PUBLIC_CONVERTER_BASE_URL` with. */
export const BASE = "http://converter.test";

export const handlers = [
  http.get(`${BASE}/formats`, () => HttpResponse.json(MATRIX)),
  http.get(`${BASE}/health`, () => HttpResponse.json({ status: "ok" })),
];

/** The JSON error envelope, exactly as the contract describes it. */
export function envelope(status: number, code: ErrorCode, message: string) {
  return HttpResponse.json({ error: { code, message } }, { status });
}

/**
 * A non-2xx whose body is not JSON at all.
 *
 * A reverse proxy's `413` is an HTML page, and the contract requires the client
 * to fall back to `HTTP <status>` rather than render any of it.
 */
export function htmlError(
  status: number,
  body = "<html><body>Request Entity Too Large</body></html>",
) {
  return new HttpResponse(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export interface ConvertedOptions {
  mediaType: string;
  body?: string;
  /** The full header, so a test can exercise both RFC 6266 forms. */
  disposition?: string | null;
  requestId?: string | null;
}

/** A `200` with the target's own media type — the success case. */
export function converted({
  mediaType,
  body = "converted",
  disposition = 'attachment; filename="converted.pdf"; filename*=UTF-8\'\'converted.pdf',
  requestId = "req-test-1",
}: ConvertedOptions) {
  const headers = new Headers({ "Content-Type": mediaType });
  if (disposition !== null) headers.set("Content-Disposition", disposition);
  if (requestId !== null) headers.set("X-Request-Id", requestId);
  return new HttpResponse(body, { status: 200, headers });
}

/**
 * The `Content-Disposition` the contract documents for a Word document turned
 * into a PDF, with a filename that needs the `filename*` form to survive.
 */
export const QUARTERLY_REPORT_DISPOSITION =
  'attachment; filename="Quarterly report.pdf"; filename*=UTF-8\'\'Quarterly%20report.pdf';
