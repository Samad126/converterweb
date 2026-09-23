/**
 * The `/pdf/*` toolkit's shared plumbing, exercised through its first two
 * tools. Same depth as `tests/converter/conversion.test.tsx`: a happy path, a server
 * error shown verbatim, and the option field actually going out on the wire.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { CompressTool } from "@/components/pdf/CompressTool";
import { OcrTool } from "@/components/pdf/OcrTool";

import { BASE, envelope } from "../msw/handlers";
import { server } from "../msw/server";

function pdfFile(name = "scan.pdf"): File {
  return new File(["%PDF-1.4 fake"], name, { type: "application/pdf" });
}

async function choosePdf(user: ReturnType<typeof userEvent.setup>, name = "scan.pdf"): Promise<void> {
  const input = screen.getByLabelText(/Choose a file, or drop one here/) as HTMLInputElement;
  await user.upload(input, pdfFile(name));
}

describe("OCR", () => {
  it("downloads the PDF the server returns", async () => {
    server.use(
      http.post(`${BASE}/pdf/ocr`, () =>
        new HttpResponse("%PDF-1.4 ocred", {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'attachment; filename="scan.pdf"',
          },
        }),
      ),
    );

    const user = userEvent.setup();
    render(<OcrTool />);
    await choosePdf(user);

    await user.click(screen.getByRole("button", { name: "Run" }));

    const download = await screen.findByRole("link", { name: /Download/ });
    expect(download).toHaveAttribute("download", "scan.pdf");
  });

  it("shows the server's sentence on failure", async () => {
    server.use(
      http.post(`${BASE}/pdf/ocr`, () =>
        envelope(422, "E_ENCRYPTED", "This PDF is password protected."),
      ),
    );

    const user = userEvent.setup();
    render(<OcrTool />);
    await choosePdf(user);
    await user.click(screen.getByRole("button", { name: "Run" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This PDF is password protected.",
    );
  });

  it("sends force=true only when the checkbox is checked", async () => {
    let sawForce = false;
    server.use(
      http.post(`${BASE}/pdf/ocr`, async ({ request }) => {
        const body = await request.text();
        sawForce = /name="force"/.test(body) && /\btrue\b/.test(body);
        return new HttpResponse("%PDF-1.4", {
          status: 200,
          headers: { "Content-Type": "application/pdf" },
        });
      }),
    );

    const user = userEvent.setup();
    render(<OcrTool />);
    await choosePdf(user);
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Run" }));

    await screen.findByRole("link", { name: /Download/ });
    expect(sawForce).toBe(true);
  });
});

describe("Compress", () => {
  it("sends the chosen level and downloads the result", async () => {
    let sawLevel = false;
    server.use(
      http.post(`${BASE}/pdf/compress`, async ({ request }) => {
        const body = await request.text();
        sawLevel = /name="level"/.test(body) && /\bhigh\b/.test(body);
        return new HttpResponse("%PDF-1.4 small", {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'attachment; filename="report.pdf"',
          },
        });
      }),
    );

    const user = userEvent.setup();
    render(<CompressTool />);
    await choosePdf(user, "report.pdf");
    await user.click(screen.getByRole("radio", { name: /High/ }));
    await user.click(screen.getByRole("button", { name: "Run" }));

    const download = await screen.findByRole("link", { name: /Download/ });
    expect(download).toHaveAttribute("download", "report.pdf");
    expect(sawLevel).toBe(true);
  });
});
