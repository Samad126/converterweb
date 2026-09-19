/**
 * The happy paths, and the two ways a `200` can still be wrong.
 *
 * Every one of these drives the real components against MSW: the matrix is
 * fetched, the picker is built from it, the upload goes out over XHR, and the
 * result is whatever the handler said.
 */
import { cleanup, screen, within } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";

import {
  QUARTERLY_REPORT_DISPOSITION,
  BASE,
  converted,
} from "./msw/handlers";
import { server } from "./msw/server";
import {
  chooseFile,
  chooseFormat,
  convertNow,
  convertFile,
  formatChip,
  setupPage,
} from "./helpers";

describe("a successful conversion", () => {
  it("downloads the file under the server's name with the target's extension", async () => {
    let sawTarget = "";
    server.use(
      http.post(`${BASE}/convert/:target`, ({ params }) => {
        sawTarget = String(params.target);
        return converted({
          mediaType: "application/pdf",
          body: "%PDF-1.4 fake",
          disposition: QUARTERLY_REPORT_DISPOSITION,
          requestId: "req-abc-123",
        });
      }),
    );

    const user = await setupPage();
    await convertFile(user, "Quarterly report.docx", "PDF");

    const download = await screen.findByRole("link", { name: /Download/ });
    // The upload name with the target's extension — not the `.docx` it went out
    // as, and not anything derived from the header's own extension.
    expect(download).toHaveAttribute("download", "Quarterly report.pdf");
    expect(download).toHaveAttribute("href", expect.stringContaining("blob:"));

    expect(sawTarget).toBe("pdf");
    expect(screen.getByText("Quarterly report.pdf")).toBeInTheDocument();
    expect(screen.getByText("Converted")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Convert another file" })).toBeInTheDocument();
  });

  it("treats a 200 with text/html for a pdf target as a failure and offers no file", async () => {
    server.use(
      http.post(`${BASE}/convert/pdf`, () =>
        converted({
          mediaType: "text/html",
          body: "<html><body>Not a PDF</body></html>",
          requestId: "req-mismatch-1",
        }),
      ),
    );

    const user = await setupPage();
    await convertFile(user, "Quarterly report.docx", "PDF");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("The converter returned an unexpected file type.");
    // Nothing to download, and no filename that would suggest otherwise.
    expect(screen.queryByRole("link", { name: /Download/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Converted")).not.toBeInTheDocument();
    // The request id is the one thing that makes this reportable.
    expect(within(alert).getByText("req-mismatch-1")).toBeInTheDocument();
  });

  it("accepts text/plain for a txt target even though the header carries a charset", async () => {
    // `/formats` declares this target as "text/plain; charset=utf-8", so the
    // comparison has to ignore parameters in both directions.
    server.use(
      http.post(`${BASE}/convert/txt`, () =>
        converted({
          mediaType: "text/plain; charset=utf-8",
          body: "Quarterly report\n\nRevenue was up.",
          disposition: 'attachment; filename="Quarterly report.txt"',
        }),
      ),
    );

    const user = await setupPage();
    await convertFile(user, "Quarterly report.docx", "TXT");

    expect(await screen.findByRole("link", { name: /Download/ })).toHaveAttribute(
      "download",
      "Quarterly report.txt",
    );
  });
});

describe("image targets", () => {
  it("saves a png conversion as an archive and says why", async () => {
    server.use(
      http.post(`${BASE}/convert/png`, () =>
        converted({
          mediaType: "application/zip",
          body: "PK fake zip",
          // The server echoes the image extension, which is exactly why the
          // extension for the download has to come from `multiple` instead.
          disposition: 'attachment; filename="Deck.png"',
        }),
      ),
    );

    const user = await setupPage();
    await chooseFile(user, "Deck.pptx");
    await chooseFormat(user, "PNG");

    // The chip advertises the archive before the conversion is even started.
    expect(formatChip("PNG")).toHaveTextContent("ZIP");

    await convertNow(user, "Convert to PNG");

    const download = await screen.findByRole("link", { name: /Download/ });
    expect(download).toHaveAttribute("download", "Deck.zip");
    expect(screen.getByText("A ZIP archive containing one image per page.")).toBeInTheDocument();
  });

  it("still says one image per page for a one-page source", async () => {
    // The contract is explicit that the content type must not depend on how
    // many pages the upload happened to have — so a deck with a single slide
    // gets the same archive and the same sentence.
    server.use(
      http.post(`${BASE}/convert/png`, () =>
        converted({
          mediaType: "application/zip",
          body: "PK fake zip with exactly one entry",
          disposition: 'attachment; filename="one-slide.png"',
        }),
      ),
    );

    const user = await setupPage();
    await convertFile(user, "one-slide.pptx", "PNG");

    const download = await screen.findByRole("link", { name: /Download/ });
    expect(download).toHaveAttribute("download", "one-slide.zip");
    expect(screen.getByText("A ZIP archive containing one image per page.")).toBeInTheDocument();
  });
});

describe("the request id", () => {
  it("is not shown when there is nothing to report", async () => {
    server.use(
      http.post(`${BASE}/convert/txt`, () =>
        converted({
          mediaType: "text/plain; charset=utf-8",
          body: "hello",
          disposition: 'attachment; filename="a.txt"',
          requestId: "req-copy-me",
        }),
      ),
    );

    const user = await setupPage();
    await convertFile(user, "a.docx", "TXT");

    await screen.findByRole("link", { name: /Download/ });
    // The id is captured on every response, but the line that shows it belongs
    // to the failure state — a success is not something to quote a reference
    // number about.
    expect(screen.queryByText("req-copy-me")).not.toBeInTheDocument();
    expect(screen.queryByText(/X-Request-Id/)).not.toBeInTheDocument();
  });
});

describe("the text preview", () => {
  it("renders a converted text file in a sandboxed frame, and only on request", async () => {
    server.use(
      http.post(`${BASE}/convert/txt`, () =>
        converted({
          mediaType: "text/plain; charset=utf-8",
          body: "<script>alert('no')</script>\nplain text",
          disposition: 'attachment; filename="a.txt"',
        }),
      ),
    );

    const user = await setupPage();
    await convertFile(user, "a.docx", "TXT");

    // Nothing is rendered until it is asked for: the bytes stay in a blob.
    expect(screen.queryByTitle(/Preview of/)).not.toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: /Preview/ }));

    const frame = await screen.findByTitle("Preview of a.txt");
    expect(frame.tagName).toBe("IFRAME");
    // The whole security model, in one attribute.
    expect(frame).toHaveAttribute("sandbox", "");
    expect(frame).not.toHaveAttribute("sandbox", expect.stringContaining("allow-scripts"));
    // Text targets are escaped into a <pre>, so markup in the file is shown
    // rather than parsed.
    const srcDoc = frame.getAttribute("srcdoc") ?? "";
    expect(srcDoc).toContain("&lt;script&gt;");
    expect(srcDoc).not.toContain("<script>alert");
  });

  it("offers no preview for a binary target", async () => {
    server.use(
      http.post(`${BASE}/convert/pdf`, () =>
        converted({ mediaType: "application/pdf", body: "%PDF-1.4" }),
      ),
    );

    const user = await setupPage();
    await convertFile(user, "a.docx", "PDF");

    await screen.findByRole("link", { name: /Download/ });
    expect(screen.queryByRole("button", { name: /Preview/ })).not.toBeInTheDocument();
  });
});

describe("the object URL", () => {
  it("is revoked when the person starts another conversion", async () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL");
    server.use(
      http.post(`${BASE}/convert/pdf`, () =>
        converted({ mediaType: "application/pdf", body: "%PDF-1.4" }),
      ),
    );

    const user = await setupPage();
    await convertFile(user, "a.docx", "PDF");

    const download = await screen.findByRole("link", { name: /Download/ });
    const url = download.getAttribute("href");
    expect(url).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Convert another file" }));
    expect(revoke).toHaveBeenCalledWith(url);
  });

  it("is revoked when the page goes away", async () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL");
    server.use(
      http.post(`${BASE}/convert/pdf`, () =>
        converted({ mediaType: "application/pdf", body: "%PDF-1.4" }),
      ),
    );

    const user = await setupPage();
    await convertFile(user, "a.docx", "PDF");

    const download = await screen.findByRole("link", { name: /Download/ });
    const url = download.getAttribute("href");

    cleanup();
    expect(revoke).toHaveBeenCalledWith(url);
  });
});

describe("the multipart request", () => {
  // The shape of the part — one entry named `file`, declared
  // application/octet-stream, named with the original extension — is asserted
  // in `tests/transport.test.ts`, against the bytes that actually arrived at a
  // socket. It is not asserted here because MSW rebuilds the body before a
  // handler sees it, and a test of a reconstruction is a test of MSW.

  it("posts to /convert/{target} and never to the bare path", async () => {
    const seen: string[] = [];
    server.use(
      http.post(`${BASE}/convert/:target`, ({ request }) => {
        seen.push(new URL(request.url).pathname);
        return converted({ mediaType: "application/pdf", body: "%PDF-1.4" });
      }),
    );

    const user = await setupPage();
    await convertFile(user, "a.docx", "PDF");
    await screen.findByRole("link", { name: /Download/ });

    expect(seen).toEqual(["/convert/pdf"]);
  });
});

describe("the archive note", () => {
  it("is not shown for a single-file target", async () => {
    server.use(
      http.post(`${BASE}/convert/pdf`, () =>
        converted({ mediaType: "application/pdf", body: "%PDF-1.4" }),
      ),
    );

    const user = await setupPage();
    await chooseFile(user, "a.docx");
    await chooseFormat(user, "PDF");

    expect(
      screen.queryByText(/one image per page/),
    ).not.toBeInTheDocument();
  });
});

describe("a 200 that is not the promised type", () => {
  it("never offers the body as a download, for any target", async () => {
    // A reverse proxy answering with its own error page under a 200.
    server.use(
      http.post(`${BASE}/convert/pdf`, () =>
        new HttpResponse("<html>Gateway page</html>", {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }),
      ),
    );

    const user = await setupPage();
    await convertFile(user, "a.docx", "PDF");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The converter returned an unexpected file type.",
    );
    expect(screen.queryByRole("link", { name: /Download/ })).not.toBeInTheDocument();
  });
});
