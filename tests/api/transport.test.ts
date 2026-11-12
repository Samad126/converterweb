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
import { http, passthrough } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { convert } from "@/lib/api/api";
import { CLIENT_ABORT_MS } from "@/lib/constants";

import { server as mswServer } from "../msw/server";
import { parseMultipart, startServer, withNativeXhr } from "./transport/server";

/** Point the API at the test server for as long as `body` runs. */
async function against<T>(origin: string, body: () => Promise<T>): Promise<T> {
  const previous = process.env.NEXT_PUBLIC_CONVERTER_BASE_URL;
  process.env.NEXT_PUBLIC_CONVERTER_BASE_URL = origin;
  // The job flow polls with `fetch`, which MSW would otherwise intercept; these
  // tests are about the real socket, so let this one origin through.
  mswServer.use(http.all(`${origin}/*`, () => passthrough()));
  try {
    return await withNativeXhr(body);
  } finally {
    process.env.NEXT_PUBLIC_CONVERTER_BASE_URL = previous;
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

/** A server that has the jobs endpoint: accepts, reports done at once, serves the PDF. */
function jobsServer(request: { url?: string }, response: import("node:http").ServerResponse): void {
  const url = request.url ?? "";
  if (url === "/convert/pdf/jobs") {
    response.writeHead(202, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ id: "j1", status: "queued", statusUrl: "/convert/jobs/j1" }));
  } else if (url.startsWith("/convert/jobs/j1/download")) {
    response.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="a.pdf"',
    });
    response.end("%PDF-1.4");
  } else if (url.startsWith("/convert/jobs/j1")) {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ id: "j1", status: "done", downloadUrl: "/convert/jobs/j1/download" }));
  } else {
    response.writeHead(404, { "Content-Type": "application/json" });
    response.end("{}");
  }
}

describe("the upload", () => {
  it("sends exactly one part named file, as octet-stream, keeping the extension", async () => {
    const server = await startServer(jobsServer);

    try {
      await against(server.origin, async () => {
        const handle = convert(
          "pdf",
          [new File(["hello"], "Quarterly report.DOCX", { type: "text/plain" })],
        );
        await handle.promise;
      });
    } finally {
      await server.close();
    }

    // Read out of the bytes that actually arrived, not out of a body the
    // intercepting library reconstructed.
    const request = server.requests[0];
    expect(request?.method).toBe("POST");
    expect(request?.url).toBe("/convert/pdf/jobs");

    const parts = parseMultipart(
      request?.text ?? "",
      String(request?.headers["content-type"] ?? ""),
    );
    expect(parts).toHaveLength(1);
    expect(parts[0]?.name).toBe("files");
    // The declared type is deliberately not the file's own: the server picks
    // its import filter from the filename extension and ignores this.
    expect(parts[0]?.contentType).toBe("application/octet-stream");
    // The extension is the entire mechanism, so it has to survive the wire.
    expect(parts[0]?.filename).toBe("Quarterly report.DOCX");
    expect(parts[0]?.value).toBe("hello");
  });

  it("reports upload progress and then that the upload is done", async () => {
    const server = await startServer(jobsServer);

    const progress: Array<{ loaded: number; total: number | null }> = [];
    let uploadComplete = false;

    try {
      await against(server.origin, async () => {
        const handle = convert("pdf", [new File(["x".repeat(8192)], "a.docx", { type: "" })], {
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

describe("the job flow", () => {
  it("uploads, waits for the job, and returns the finished file", async () => {
    const server = await startServer(jobsServer);
    try {
      const result = await against(server.origin, () =>
        convert("pdf", [new File(["hello"], "a.docx", { type: "" })]).promise,
      );
      expect(result.mediaType).toBe("application/pdf");
      expect(result.disposition).toContain("a.pdf");
      expect(await result.blob.text()).toBe("%PDF-1.4");
    } finally {
      await server.close();
    }
    expect(server.requests.map((r) => r.url?.split("?")[0])).toEqual([
      "/convert/pdf/jobs",
      "/convert/jobs/j1",
      "/convert/jobs/j1/download",
    ]);
  });

  it("falls back to the synchronous request when the server has no jobs endpoint", async () => {
    const server = await startServer((request, response) => {
      if (request.url === "/convert/pdf") {
        response.writeHead(200, { "Content-Type": "application/pdf" });
        response.end("%PDF-1.4");
      } else {
        response.writeHead(404, { "Content-Type": "application/json" });
        response.end("{}");
      }
    });
    try {
      const result = await against(server.origin, () =>
        convert("pdf", [new File(["hello"], "a.docx", { type: "" })]).promise,
      );
      expect(await result.blob.text()).toBe("%PDF-1.4");
    } finally {
      await server.close();
    }
  });

  it("reports a job that failed with the server's own sentence", async () => {
    const server = await startServer((request, response) => {
      response.writeHead(request.url === "/convert/pdf/jobs" ? 202 : 200, {
        "Content-Type": "application/json",
      });
      response.end(
        request.url === "/convert/pdf/jobs"
          ? JSON.stringify({ id: "j2", status: "queued" })
          : JSON.stringify({
              id: "j2",
              status: "failed",
              errorStatus: 422,
              error: { code: "E_CONVERT_FAILED", message: "That document could not be converted." },
            }),
      );
    });
    try {
      await against(server.origin, async () => {
        await expect(
          convert("pdf", [new File(["hello"], "a.docx", { type: "" })]).promise,
        ).rejects.toMatchObject({
          failure: { kind: "http", status: 422, message: "That document could not be converted." },
        });
      });
    } finally {
      await server.close();
    }
  });
});

describe("cancelling", () => {
  it("aborts the request and says so when the person cancels", async () => {
    const server = await startServer(() => {
      // Deliberately never answers.
    });

    try {
      await against(server.origin, async () => {
        const handle = convert("pdf", [new File(["hello"], "a.docx", { type: "" })]);
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

    // The deadline is 240 s and waiting for it is not an option, so the test
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
        const handle = convert("pdf", [new File(["hello"], "a.docx", { type: "" })]);
        await new Promise((resolve) => realSetTimeout(resolve, 50));

        const deadline = calls.find(([, delay]) => delay === CLIENT_ABORT_MS);
        expect(deadline, "no timer armed at CLIENT_ABORT_MS").toBeDefined();
        expect(CLIENT_ABORT_MS).toBe(240_000);

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
