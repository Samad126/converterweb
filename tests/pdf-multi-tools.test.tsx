/**
 * The two `/pdf/*` tools that take several files under one repeated field
 * name — `merge` and `scan-to-pdf` — exercised through `usePdfMultiFileTool`
 * and `PdfMultiToolShell`.
 *
 * Neither tool has a scalar option field of its own (the whole request is
 * `files`), so the depth here is the multi-file shape itself: the minimum
 * file count is enforced before a request is ever made, every chosen file
 * goes out under `files`, the order shown on screen is the order `Move up`
 * and `Move down` leave it in, and a server failure is shown verbatim — the
 * same as every other `/pdf/*` tool.
 *
 * The request's own multipart body is read only for the number of `files`
 * parts. jsdom's `FormData`/`XMLHttpRequest` do not reliably preserve a
 * `File`'s bytes or an explicit `filename` argument once it crosses into
 * MSW's interception layer in this test environment, so the *order* the
 * files were uploaded in is asserted the way the person watching the screen
 * would see it — in the list `PdfMultiToolShell` renders — rather than by
 * reading it back off the wire.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { MergeTool } from "@/components/pdf/MergeTool";
import { ScanToPdfTool } from "@/components/pdf/ScanToPdfTool";

import { BASE, envelope } from "./msw/handlers";
import { server } from "./msw/server";

function pdfFile(name: string): File {
  return new File(["%PDF-1.4 fake"], name, { type: "application/pdf" });
}

function imageFile(name: string): File {
  return new File(["fake image bytes"], name, { type: "application/octet-stream" });
}

/** How many `files` parts the request carried. */
function filePartCount(body: string): number {
  return [...body.matchAll(/name="files"/g)].length;
}

function okPdf(filename = "result.pdf") {
  return new HttpResponse("%PDF-1.4 result", {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

describe("MergeTool", () => {
  it("stays disabled with fewer than two files", async () => {
    render(<MergeTool />);
    const input = screen.getByLabelText(/Choose a file, or drop one here/) as HTMLInputElement;
    const user = userEvent.setup();
    await user.upload(input, pdfFile("a.pdf"));

    expect(screen.getByRole("button", { name: "Run" })).toBeDisabled();
  });

  it("lists every chosen file, in upload order", async () => {
    const user = userEvent.setup();
    render(<MergeTool />);
    const input = screen.getByLabelText(/Choose a file, or drop one here/) as HTMLInputElement;
    await user.upload(input, pdfFile("a.pdf"));
    await user.upload(input, pdfFile("b.pdf"));

    expect(screen.getByText("1. a.pdf")).toBeInTheDocument();
    expect(screen.getByText("2. b.pdf")).toBeInTheDocument();
  });

  it("sends every file under `files` and downloads the merged PDF", async () => {
    let body = "";
    server.use(
      http.post(`${BASE}/pdf/merge`, async ({ request }) => {
        body = await request.text();
        return okPdf("merged.pdf");
      }),
    );

    const user = userEvent.setup();
    render(<MergeTool />);
    const input = screen.getByLabelText(/Choose a file, or drop one here/) as HTMLInputElement;
    await user.upload(input, pdfFile("a.pdf"));
    await user.upload(input, pdfFile("b.pdf"));

    const button = screen.getByRole("button", { name: "Run" });
    expect(button).toBeEnabled();
    await user.click(button);

    const download = await screen.findByRole("link", { name: /Download/ });
    expect(download).toHaveAttribute("download", "merged.pdf");
    expect(filePartCount(body)).toBe(2);
  });

  it("reorders a file when Move up is pressed", async () => {
    const user = userEvent.setup();
    render(<MergeTool />);
    const input = screen.getByLabelText(/Choose a file, or drop one here/) as HTMLInputElement;
    await user.upload(input, pdfFile("a.pdf"));
    await user.upload(input, pdfFile("b.pdf"));

    const moveUpButtons = screen.getAllByRole("button", { name: "Move up" });
    // The second file's "Move up" button.
    await user.click(moveUpButtons[1] as HTMLElement);

    expect(screen.getByText("1. b.pdf")).toBeInTheDocument();
    expect(screen.getByText("2. a.pdf")).toBeInTheDocument();
  });

  it("drops a file when Remove is pressed", async () => {
    const user = userEvent.setup();
    render(<MergeTool />);
    const input = screen.getByLabelText(/Choose a file, or drop one here/) as HTMLInputElement;
    await user.upload(input, pdfFile("a.pdf"));
    await user.upload(input, pdfFile("b.pdf"));

    await user.click(screen.getAllByRole("button", { name: "Remove" })[0] as HTMLElement);

    expect(screen.queryByText(/a\.pdf/)).toBeNull();
    expect(screen.getByText("1. b.pdf")).toBeInTheDocument();
    // Back under the minimum, so the button disables itself again.
    expect(screen.getByRole("button", { name: "Run" })).toBeDisabled();
  });

  it("shows the server's sentence on failure", async () => {
    server.use(
      http.post(`${BASE}/pdf/merge`, () => envelope(400, "E_TOO_FEW_FILES", "Merge needs at least two files.")),
    );
    const user = userEvent.setup();
    render(<MergeTool />);
    const input = screen.getByLabelText(/Choose a file, or drop one here/) as HTMLInputElement;
    await user.upload(input, pdfFile("a.pdf"));
    await user.upload(input, pdfFile("b.pdf"));
    await user.click(screen.getByRole("button", { name: "Run" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Merge needs at least two files.");
  });
});

describe("ScanToPdfTool", () => {
  it("sends the chosen image under `files` and downloads the built PDF", async () => {
    let body = "";
    server.use(
      http.post(`${BASE}/pdf/scan-to-pdf`, async ({ request }) => {
        body = await request.text();
        return okPdf("scan.pdf");
      }),
    );

    const user = userEvent.setup();
    render(<ScanToPdfTool />);
    const input = screen.getByLabelText(/Choose a file, or drop one here/) as HTMLInputElement;
    await user.upload(input, imageFile("photo-1.jpg"));

    const button = screen.getByRole("button", { name: "Run" });
    expect(button).toBeEnabled();
    await user.click(button);

    const download = await screen.findByRole("link", { name: /Download/ });
    expect(download).toHaveAttribute("download", "scan.pdf");
    expect(filePartCount(body)).toBe(1);
  });

  it("shows the server's sentence on failure", async () => {
    server.use(
      http.post(`${BASE}/pdf/scan-to-pdf`, () =>
        envelope(400, "E_TOO_FEW_FILES", "Scan to PDF needs at least one file."),
      ),
    );
    const user = userEvent.setup();
    render(<ScanToPdfTool />);
    const input = screen.getByLabelText(/Choose a file, or drop one here/) as HTMLInputElement;
    await user.upload(input, imageFile("photo-1.jpg"));
    await user.click(screen.getByRole("button", { name: "Run" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Scan to PDF needs at least one file.",
    );
  });
});
