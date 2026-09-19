/**
 * The two things that have to be tested against a real socket.
 *
 * MSW's `XMLHttpRequest` interceptor implements no `abort()` — the word appears
 * in its bundle only in a list of event names — so a cancelled request is never
 * reported as cancelled, and the 120 second deadline and the Cancel button are
 * both built on exactly that. It also reconstructs a request body rather than
 * showing you one, which is the wrong thing to assert a multipart part against.
 *
 * So these tests run jsdom's own `XMLHttpRequest` against a real server on an
 * ephemeral port. Everything else in this suite uses MSW.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { convert } from "@/lib/api";
import { CLIENT_ABORT_MS } from "@/lib/constants";

import { parseMultipart, startServer, withNativeXhr } from "./transport/server";

/** Point the API at the test server for as long as `body` runs. */
async function against<T>(origin: string, body: () => Promise<T>): Promise<T> {
  const previous = process.env.NEXT_PUBLIC_CONVERTER_BASE_URL;
  process.env.NEXT_PUBLIC_CONVERTER_BASE_URL = origin;
  try {
    return await withNativeXhr(body);
  } finally {
    process.env.NEXT_PUBLIC_CONVERTER_BASE_URL = previous;
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the upload", () => {
  it("sends exactly one part named file, as octet-stream, keeping the extension", async () => {
    const server = await startServer((_request, response) => {
      response.writeHead(200, { "Content-Type": "application/pdf" });
      response.end("%PDF-1.4");
    });

    try {
      await against(server.origin, async () => {
        const handle = convert(
          "pdf",
          new File(["hello"], "Quarterly report.DOCX", { type: "text/plain" }),
        );
        await handle.promise;
      });
    } finally {
      await server.close();
    }

    // Read out of the bytes that actually arrived, not out of a body the
    // intercepting library reconstructed.
    expect(server.requests).toHaveLength(1);
    const request = server.requests[0];
    expect(request?.method).toBe("POST");
    expect(request?.url).toBe("/convert/pdf");

    const parts = parseMultipart(
      request?.text ?? "",
      String(request?.headers["content-type"] ?? ""),
    );
    expect(parts).toHaveLength(1);
    expect(parts[0]?.name).toBe("file");
    // The declared type is deliberately not the file's own: the server picks
    // its import filter from the filename extension and ignores this.
    expect(parts[0]?.contentType).toBe("application/octet-stream");
    // The extension is the entire mechanism, so it has to survive the wire.
    expect(parts[0]?.filename).toBe("Quarterly report.DOCX");
    expect(parts[0]?.value).toBe("hello");
  });

  it("reports upload progress and then that the upload is done", async () => {
    const server = await startServer((_request, response) => {
      response.writeHead(200, { "Content-Type": "application/pdf" });
      response.end("%PDF-1.4");
    });

    const progress: Array<{ loaded: number; total: number | null }> = [];
    let uploadComplete = false;

    try {
      await against(server.origin, async () => {
        const handle = convert("pdf", new File(["x".repeat(8192)], "a.docx", { type: "" }), {
          onUploadProgress: (event) => progress.push(event),
          onUploadComplete: () => {
            uploadComplete = true;
          },
        });
        await handle.promise;
      });
    } finally {
      await server.close();
    }

    expect(progress.length).toBeGreaterThan(0);
    expect(progress.some((event) => event.total !== null && event.loaded > 0)).toBe(true);
    expect(uploadComplete).toBe(true);
  });
});

describe("cancelling", () => {
  it("aborts the request and says so when the person cancels", async () => {
    const server = await startServer(() => {
      // Deliberately never answers.
    });

    try {
      await against(server.origin, async () => {
        const handle = convert("pdf", new File(["hello"], "a.docx", { type: "" }));
        await new Promise((resolve) => setTimeout(resolve, 50));
        handle.abort();

        await expect(handle.promise).rejects.toMatchObject({
          failure: { kind: "cancelled", message: "The conversion was cancelled." },
        });
      });
    } finally {
      await server.close();
    }
  });

  it("arms a 120 second deadline, and firing it cancels the request", async () => {
    const server = await startServer(() => {
      // Deliberately never answers: this is the server being slow.
    });

    // The deadline is 120 s and waiting for it is not an option, so the test
    // finds the timer the code armed and fires it. The delay it asserts is the
    // contract's number, not a number the test chose.
    const calls: Array<[() => void, number | undefined]> = [];
    const realSetTimeout = globalThis.setTimeout;
    vi.spyOn(globalThis, "setTimeout").mockImplementation(((
      handler: () => void,
      delay?: number,
    ) => {
      calls.push([handler, delay]);
      return realSetTimeout(handler, delay);
    }) as typeof setTimeout);

    try {
      await against(server.origin, async () => {
        const handle = convert("pdf", new File(["hello"], "a.docx", { type: "" }));
        await new Promise((resolve) => realSetTimeout(resolve, 50));

        const deadline = calls.find(([, delay]) => delay === CLIENT_ABORT_MS);
        expect(deadline, "no timer armed at CLIENT_ABORT_MS").toBeDefined();
        expect(CLIENT_ABORT_MS).toBe(120_000);

        deadline?.[0]();

        await expect(handle.promise).rejects.toMatchObject({
          failure: {
            kind: "timed-out",
            message: "The conversion took too long and was cancelled.",
          },
        });
      });
    } finally {
      await server.close();
    }
  });
});
