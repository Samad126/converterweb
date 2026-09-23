/**
 * A real HTTP server on an ephemeral port, for the two tests that cannot use
 * MSW — see `./nativeXhr.ts` for why.
 *
 * It records the raw request bytes and the headers, which is what lets the
 * multipart assertions be about the multipart body rather than about a
 * reconstruction of it. Responses carry permissive CORS headers, because jsdom
 * enforces the same-origin policy for real and the test page's origin is not
 * this server's.
 */
import { createServer, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

import { getNativeXhr } from "./nativeXhr";

export interface RecordedRequest {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  /** The exact bytes that arrived. */
  body: Buffer;
  /** The body as text, for parsing a multipart payload by hand. */
  text: string;
}

export type Responder = (request: RecordedRequest, response: ServerResponse) => void;

export interface TestServer {
  /** `http://127.0.0.1:<port>` */
  origin: string;
  requests: RecordedRequest[];
  close: () => Promise<void>;
}

export async function startServer(responder: Responder): Promise<TestServer> {
  const requests: RecordedRequest[] = [];

  const server = createServer((request, response) => {
    if (request.method === "OPTIONS") {
      // XHR preflights a cross-origin request that has an `upload` listener,
      // which ours always does — that is how progress is reported. A real
      // deployment serves the page and the API from one origin, so there is no
      // preflight to answer; here there is, and it is not what any test is
      // about.
      response.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "0",
      });
      response.end();
      return;
    }

    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const body = Buffer.concat(chunks);
      const recorded: RecordedRequest = {
        method: request.method ?? "",
        url: request.url ?? "",
        headers: request.headers,
        body,
        text: body.toString("utf8"),
      };
      requests.push(recorded);
      response.setHeader("Access-Control-Allow-Origin", "*");
      response.setHeader(
        "Access-Control-Expose-Headers",
        "Content-Disposition, X-Request-Id, Content-Type",
      );
      responder(recorded, response);
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    origin: `http://127.0.0.1:${port}`,
    requests,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

/**
 * Run `body` with the un-intercepted `XMLHttpRequest` in place.
 *
 * MSW's interceptor replaces the global constructor, so swapping it back is the
 * whole mechanism — the app calls `new XMLHttpRequest()` and gets jsdom's.
 */
export async function withNativeXhr<T>(body: () => Promise<T>): Promise<T> {
  const native = getNativeXhr();
  if (!native) throw new Error("The native XMLHttpRequest was not captured by the setup file.");

  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "XMLHttpRequest");
  // MSW installs its proxy as a non-writable property, so this is a
  // `defineProperty` and not an assignment.
  Object.defineProperty(globalThis, "XMLHttpRequest", {
    configurable: true,
    writable: true,
    value: native,
  });

  try {
    return await body();
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "XMLHttpRequest", descriptor);
  }
}

/**
 * The parts of a `multipart/form-data` body, parsed from the bytes.
 *
 * Deliberately hand-rolled and deliberately strict: a parser that leaned on
 * `FormData` would be asking the same library that produced the body to
 * describe it, and the point of this test is to look at what actually arrived.
 */
export interface RawPart {
  name: string;
  filename: string | null;
  contentType: string | null;
  value: string;
}

export function parseMultipart(body: string, contentType: string): RawPart[] {
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  const boundary = (boundaryMatch?.[1] ?? boundaryMatch?.[2] ?? "").trim();
  if (boundary === "") throw new Error(`No boundary in Content-Type: ${contentType}`);

  return body
    .split(`--${boundary}`)
    .slice(1, -1)
    .map((chunk) => {
      const headerEnd = chunk.indexOf("\r\n\r\n");
      const rawHeaders = chunk.slice(0, headerEnd);
      const value = chunk.slice(headerEnd + 4).replace(/\r\n$/, "");

      const disposition = /content-disposition:\s*([^\r\n]+)/i.exec(rawHeaders)?.[1] ?? "";
      const name = /name="([^"]*)"/.exec(disposition)?.[1] ?? "";
      const filename = /filename="([^"]*)"/.exec(disposition)?.[1] ?? null;
      const partType = /content-type:\s*([^\r\n]+)/i.exec(rawHeaders)?.[1]?.trim() ?? null;

      return { name, filename, contentType: partType, value };
    });
}
