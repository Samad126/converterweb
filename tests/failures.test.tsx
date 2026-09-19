/**
 * Every way a conversion can fail, and what the page does about it.
 *
 * The table in the brief is the table here: one case per status, asserting the
 * server's own sentence appears untouched and that the state offers exactly the
 * actions it should. A conversion failure is a normal event — LibreOffice
 * parsing untrusted input — so none of this is an "unexpected error" path.
 */
import { screen, waitFor, within } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MAX_UPLOAD_BYTES, RATE_LIMIT_COOLDOWN_MS } from "@/lib/constants";

import { BASE, envelope, htmlError } from "./msw/handlers";
import { MATRIX } from "./msw/matrix";
import { server } from "./msw/server";
import {
  chooseFile,
  chooseFileOfSize,
  chooseFormat,
  convertNow,
  dropFile,
  setupPage,
} from "./helpers";

/** A conversion that fails with the given envelope. */
function convertFails(status: number, code: Parameters<typeof envelope>[1], message: string) {
  return http.post(`${BASE}/convert/:target`, () => envelope(status, code, message));
}

/** Run one conversion of a Word document to a PDF, which is expected to fail. */
async function failingConversion(): Promise<HTMLElement> {
  const user = await setupPage();
  await chooseFile(user, "Quarterly report.docx");
  await chooseFormat(user, "PDF");
  await convertNow(user, "Convert to PDF");
  return screen.findByRole("alert");
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the error envelope", () => {
  it("shows the server's sentence verbatim for a 422", async () => {
    const message = "This document is password protected.";
    server.use(convertFails(422, "E_ENCRYPTED", message));

    const alert = await failingConversion();

    // Verbatim: not reworded, not prefixed, not wrapped in a sentence of ours.
    expect(within(alert).getByText(message)).toBeInTheDocument();
    expect(alert).toHaveTextContent(/^Error\s*This document is password protected\./);
    // A password-protected document will not become readable by trying again.
    expect(within(alert).getByRole("button", { name: "Choose a different file" })).toBeInTheDocument();
  });

  it.each([
    "E_CONVERT_FAILED",
    "E_TIMEOUT",
    "E_ENCRYPTED",
    "E_UNSUPPORTED",
    "E_UNSUPPORTED_TARGET",
    "E_UNKNOWN_TARGET",
    "E_TOO_LARGE",
    "E_BUSY",
    "E_BAD_REQUEST",
    "E_RATE_LIMITED",
    "E_INTERNAL",
  ])("never puts %s in the DOM", async (code) => {
    server.use(
      convertFails(422, code as Parameters<typeof envelope>[1], "A sentence for a person to read."),
    );

    const alert = await failingConversion();
    expect(alert).toHaveTextContent("A sentence for a person to read.");

    // `error.code` is for logs and metrics. It is carried on the failure object
    // and no component is ever given it — this is the assertion that keeps that
    // true, including in an attribute or a commented-out node.
    expect(document.body.innerHTML).not.toContain(code);
    expect(document.body.textContent).not.toContain(code);
  });

  it("falls back to HTTP <status> when the body is not JSON", async () => {
    // A reverse proxy's 413 is an HTML page, and none of it may be shown.
    server.use(
      http.post(`${BASE}/convert/:target`, () =>
        htmlError(413, "<html><body><h1>413 Request Entity Too Large</h1></body></html>"),
      ),
    );

    const alert = await failingConversion();

    expect(within(alert).getByText("HTTP 413")).toBeInTheDocument();
    expect(alert).not.toHaveTextContent("Request Entity Too Large");
    expect(alert.querySelector("h1")).toBeNull();
  });

  it("falls back to HTTP <status> when the body is empty", async () => {
    server.use(
      http.post(`${BASE}/convert/:target`, () => new HttpResponse("", { status: 500 })),
    );

    const alert = await failingConversion();
    expect(within(alert).getByText("HTTP 500")).toBeInTheDocument();
  });

  it("falls back to HTTP <status> when the JSON is not the envelope", async () => {
    server.use(
      http.post(`${BASE}/convert/:target`, () =>
        HttpResponse.json({ message: "close enough" }, { status: 503 }),
      ),
    );

    const alert = await failingConversion();
    expect(within(alert).getByText("HTTP 503")).toBeInTheDocument();
    expect(alert).not.toHaveTextContent("close enough");
  });

  it("shows the request id under the error, with a copy affordance", async () => {
    server.use(
      http.post(`${BASE}/convert/:target`, () =>
        HttpResponse.json(
          { error: { code: "E_CONVERT_FAILED", message: "This document could not be converted." } },
          { status: 500, headers: { "X-Request-Id": "req-quote-me-42" } },
        ),
      ),
    );

    const user = await setupPage();
    await chooseFile(user, "a.docx");
    await chooseFormat(user, "PDF");
    await convertNow(user, "Convert to PDF");

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("req-quote-me-42")).toBeInTheDocument();

    // Installed after `userEvent.setup()`, because setup installs a clipboard
    // stub of its own and would replace anything put here first.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      writable: true,
      value: { writeText },
    });

    await user.click(within(alert).getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith("req-quote-me-42");
    expect(await within(alert).findByText("Copied")).toBeInTheDocument();
  });
});

describe("each status chooses its own way out", () => {
  it("400 shows the sentence and offers another attempt", async () => {
    server.use(convertFails(400, "E_BAD_REQUEST", "The document could not be received. Please try again."));

    const alert = await failingConversion();
    expect(alert).toHaveTextContent("The document could not be received. Please try again.");
    expect(within(alert).getByRole("button", { name: "Try again" })).toBeInTheDocument();
    // The file and the format are still valid, so the form is not in the way.
    expect(screen.queryByLabelText(/Choose a file, or drop one here/)).not.toBeInTheDocument();
  });

  it("404 resets the picker and fetches the matrix again", async () => {
    let formatsFetches = 0;
    server.use(
      http.get(`${BASE}/formats`, () => {
        formatsFetches += 1;
        return HttpResponse.json(MATRIX);
      }),
      convertFails(
        404,
        "E_UNKNOWN_TARGET",
        "That is not a format this converter can produce. Available: PDF, ODT, DOCX.",
      ),
    );

    const alert = await failingConversion();
    expect(alert).toHaveTextContent(
      "That is not a format this converter can produce. Available: PDF, ODT, DOCX.",
    );
    // Our copy of the matrix disagreed with the server's, so it is re-read.
    await waitFor(() => expect(formatsFetches).toBe(2));
    expect(within(alert).getByRole("button", { name: "Start over" })).toBeInTheDocument();
  });

  it("413 shows the sentence and offers another attempt", async () => {
    server.use(convertFails(413, "E_TOO_LARGE", "This document is too large to convert."));

    const alert = await failingConversion();
    expect(alert).toHaveTextContent("This document is too large to convert.");
    expect(within(alert).getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("415 shows the sentence verbatim and re-renders the picker", async () => {
    server.use(
      convertFails(
        415,
        "E_UNSUPPORTED_TARGET",
        "A .docx file can be converted to: PDF, ODT, TXT, HTML, RTF, EPUB.",
      ),
    );

    const user = await setupPage();
    await chooseFile(user, "Quarterly report.docx");
    await chooseFormat(user, "PDF");
    await convertNow(user, "Convert to PDF");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "A .docx file can be converted to: PDF, ODT, TXT, HTML, RTF, EPUB.",
    );

    // The document was never the problem; the target was. Pressing the action
    // puts the file back and asks for a different format.
    await user.click(within(alert).getByRole("button", { name: "Choose another format" }));

    expect(await screen.findByText("Quarterly report.docx")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /^PDF\b/ })).toBeEnabled();
  });

  it("429 disables the action for a visible cooldown, then releases it", async () => {
    const realNow = Date.now;
    let offset = 0;
    vi.spyOn(Date, "now").mockImplementation(() => realNow() + offset);

    server.use(
      convertFails(429, "E_RATE_LIMITED", "Too many requests. Try again in a moment."),
    );

    const alert = await failingConversion();
    expect(alert).toHaveTextContent("Too many requests. Try again in a moment.");

    // The cooldown is ours, not a promise from the server, and it is visible.
    const button = within(alert).getByRole("button", { name: /Try again in \d+ s/ });
    expect(button).toBeDisabled();
    expect(RATE_LIMIT_COOLDOWN_MS).toBe(30_000);

    // Nothing retries on its own; it just becomes available again.
    offset = RATE_LIMIT_COOLDOWN_MS + 1_000;
    await waitFor(() =>
      expect(within(alert).getByRole("button", { name: "Try again" })).toBeEnabled(),
    );
  });

  it("503 shows the busy sentence and offers another attempt, once", async () => {
    let attempts = 0;
    server.use(
      http.post(`${BASE}/convert/:target`, () => {
        attempts += 1;
        return envelope(503, "E_BUSY", "The converter is busy. Try again in a moment.");
      }),
    );

    const alert = await failingConversion();
    expect(alert).toHaveTextContent("The converter is busy. Try again in a moment.");
    expect(within(alert).getByRole("button", { name: "Try again" })).toBeInTheDocument();

    // One user-initiated retry, and no third request nobody asked for.
    await waitFor(() => expect(attempts).toBe(1));
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(attempts).toBe(1);
  });

  it("504 shows the server's timeout sentence, not ours", async () => {
    server.use(convertFails(504, "E_TIMEOUT", "This document took too long to convert."));

    const alert = await failingConversion();
    expect(alert).toHaveTextContent("This document took too long to convert.");
    // Our own timeout sentence is for our own 120 second abort, and must not be
    // used when the server answered.
    expect(alert).not.toHaveTextContent("The conversion took too long and was cancelled.");
    expect(within(alert).getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("500 offers another attempt and does not retry on its own", async () => {
    let attempts = 0;
    server.use(
      http.post(`${BASE}/convert/:target`, () => {
        attempts += 1;
        return envelope(
          500,
          "E_CONVERT_FAILED",
          "This document could not be converted. It may be damaged or in a format the converter does not support.",
        );
      }),
    );

    const alert = await failingConversion();
    expect(alert).toHaveTextContent("This document could not be converted.");
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(attempts).toBe(1);
  });
});

describe("client-side refusals", () => {
  it("refuses a file over 25 MiB without spending a request", async () => {
    let attempts = 0;
    server.use(
      http.post(`${BASE}/convert/:target`, () => {
        attempts += 1;
        return envelope(413, "E_TOO_LARGE", "This document is too large to convert.");
      }),
    );

    const user = await setupPage();
    await chooseFileOfSize(user, "huge.docx", MAX_UPLOAD_BYTES + 1);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("huge.docx is 25 MB.");
    expect(alert).toHaveTextContent("The largest file this converter accepts is 25 MB.");
    expect(within(alert).getByRole("button", { name: "Choose a different file" })).toBeInTheDocument();

    // No request at all — not before the refusal, and not after it.
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(attempts).toBe(0);
  });

  it("accepts a file of exactly the limit", async () => {
    const user = await setupPage();
    await chooseFileOfSize(user, "exactly.docx", MAX_UPLOAD_BYTES);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("exactly.docx")).toBeInTheDocument();
    // 25 MiB, not 25 MB — the number the proxy, the parser and this page share.
    expect(MAX_UPLOAD_BYTES).toBe(26_214_400);
  });

  it("refuses an extension the converter does not take, and names the ones it does", async () => {
    let attempts = 0;
    server.use(
      http.post(`${BASE}/convert/:target`, () => {
        attempts += 1;
        return envelope(415, "E_UNSUPPORTED", "This file type cannot be converted.");
      }),
    );

    await setupPage();
    // Dropped, not picked: `accept` filters the dialog, and a drop goes
    // straight past it, so this is the check that actually protects the path.
    dropFile("archive.zip");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("archive.zip is a .zip file, which this converter does not accept.");
    // The list is read out of `GET /formats`, so it cannot go stale.
    expect(alert).toHaveTextContent(/Accepted: \.docx, \.docm, \.doc, \.odt, \.ods/);
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(attempts).toBe(0);
  });

  it("refuses a file with no extension at all", async () => {
    await setupPage();
    dropFile("README");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("README has no file extension");
  });
});
