/**
 * `/pdf/sign`, `/pdf/redact` and `/pdf/edit` — built on `usePdfFileTool` and
 * `PdfToolShell` like the single-file tools in `tests/pdf-tools-pages.test.tsx`,
 * but each also sends a JSON `elements`/`areas` text field alongside the file.
 *
 * As `tests/pdf-multi-tools.test.tsx` notes, jsdom's `FormData`/`XMLHttpRequest`
 * do not reliably preserve file bytes once intercepted by MSW in this test
 * environment, so file-part assertions here are limited to presence/count and
 * the JSON text fields are read back and parsed directly off the wire — those
 * survive intact.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { EditTool } from "@/components/pdf/EditTool";
import { RedactTool } from "@/components/pdf/RedactTool";
import { SignTool } from "@/components/pdf/SignTool";

import { BASE, envelope } from "./msw/handlers";
import { server } from "./msw/server";

function pdfFile(name = "doc.pdf"): File {
  return new File(["%PDF-1.4 fake"], name, { type: "application/pdf" });
}

async function choosePdf(user: ReturnType<typeof userEvent.setup>, name = "doc.pdf"): Promise<void> {
  const input = screen.getByLabelText(/Choose a file, or drop one here/) as HTMLInputElement;
  await user.upload(input, pdfFile(name));
}

/** A plain multipart text field's value, read straight off the raw body. */
function extractField(body: string, name: string): string | null {
  const match = new RegExp(`name="${name}"\\r?\\n\\r?\\n([\\s\\S]*?)\\r?\\n--`).exec(body);
  return match?.[1] ?? null;
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

describe("RedactTool", () => {
  it("sends a non-empty areas array and downloads the result", async () => {
    let sawAreas: unknown = null;
    server.use(
      http.post(`${BASE}/pdf/redact`, async ({ request }) => {
        const body = await request.text();
        sawAreas = JSON.parse(extractField(body, "areas") as string);
        return okPdf();
      }),
    );

    const user = userEvent.setup();
    render(<RedactTool />);
    await choosePdf(user);
    await user.click(screen.getByRole("button", { name: "Run" }));
    await screen.findByRole("link", { name: /Download/ });

    expect(Array.isArray(sawAreas)).toBe(true);
    expect((sawAreas as unknown[]).length).toBe(1);
    expect((sawAreas as { page: number }[])[0]).toMatchObject({ page: 1 });
  });

  it("shows the server's E_INVALID_FIELD sentence verbatim", async () => {
    server.use(
      http.post(`${BASE}/pdf/redact`, () =>
        envelope(400, "E_INVALID_FIELD", 'The "areas" field must be non-empty.'),
      ),
    );

    const user = userEvent.setup();
    render(<RedactTool />);
    await choosePdf(user);
    await user.click(screen.getByRole("button", { name: "Run" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      'The "areas" field must be non-empty.',
    );
  });
});

describe("SignTool", () => {
  it("sends a typed name element and downloads the result", async () => {
    let sawElements: unknown = null;
    server.use(
      http.post(`${BASE}/pdf/sign`, async ({ request }) => {
        const body = await request.text();
        sawElements = JSON.parse(extractField(body, "elements") as string);
        return okPdf();
      }),
    );

    const user = userEvent.setup();
    render(<SignTool />);
    await choosePdf(user);

    await user.type(screen.getByLabelText("Text"), "Ada Lovelace");
    await user.click(screen.getByRole("button", { name: "Run" }));
    await screen.findByRole("link", { name: /Download/ });

    expect(Array.isArray(sawElements)).toBe(true);
    expect((sawElements as { type: string; value: string }[])[0]).toMatchObject({
      type: "text",
      value: "Ada Lovelace",
    });
  });

  it("shows the server's sentence on failure", async () => {
    server.use(
      http.post(`${BASE}/pdf/sign`, () =>
        envelope(400, "E_INVALID_FIELD", 'Element 0 needs exactly one of "value"/"imageIndex".'),
      ),
    );

    const user = userEvent.setup();
    render(<SignTool />);
    await choosePdf(user);
    await user.type(screen.getByLabelText("Text"), "Ada Lovelace");
    await user.click(screen.getByRole("button", { name: "Run" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      'Element 0 needs exactly one of "value"/"imageIndex".',
    );
  });
});

describe("EditTool", () => {
  it("sends a text element and downloads the result", async () => {
    let sawElements: unknown = null;
    server.use(
      http.post(`${BASE}/pdf/edit`, async ({ request }) => {
        const body = await request.text();
        sawElements = JSON.parse(extractField(body, "elements") as string);
        return okPdf();
      }),
    );

    const user = userEvent.setup();
    render(<EditTool />);
    await choosePdf(user);
    await user.type(screen.getByLabelText("Text"), "Approved");
    await user.click(screen.getByRole("button", { name: "Run" }));
    await screen.findByRole("link", { name: /Download/ });

    expect(Array.isArray(sawElements)).toBe(true);
    expect((sawElements as { type: string; value: string }[])[0]).toMatchObject({
      type: "text",
      value: "Approved",
    });
  });

  it("shows the server's sentence on failure", async () => {
    server.use(
      http.post(`${BASE}/pdf/edit`, () =>
        envelope(400, "E_INVALID_FIELD", 'The "freehand" element needs at least two points.'),
      ),
    );

    const user = userEvent.setup();
    render(<EditTool />);
    await choosePdf(user);
    await user.type(screen.getByLabelText("Text"), "Approved");
    await user.click(screen.getByRole("button", { name: "Run" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      'The "freehand" element needs at least two points.',
    );
  });
});
