/**
 * `/pdf/form-fields` (two-step JSON-then-file) and `/pdf/compare` (JSON-only) —
 * the two `/pdf/*` tools whose response is never a single PDF download.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { CompareTool } from "@/components/pdf/CompareTool";
import { FormFieldsTool } from "@/components/pdf/FormFieldsTool";

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

describe("FormFieldsTool", () => {
  it("shows a clear empty state for a PDF with no form", async () => {
    server.use(http.post(`${BASE}/pdf/form-fields`, () => HttpResponse.json([])));

    const user = userEvent.setup();
    render(<FormFieldsTool />);
    await choosePdf(user);
    await user.click(screen.getByRole("button", { name: "Read form fields" }));

    expect(await screen.findByText("This PDF has no fillable form fields.")).toBeInTheDocument();
  });

  it("lists fields, fills only the touched ones, and downloads the result", async () => {
    server.use(
      http.post(`${BASE}/pdf/form-fields`, () =>
        HttpResponse.json([
          { name: "name", type: "text", value: "" },
          { name: "agree", type: "checkbox", value: false },
        ]),
      ),
    );

    let sawFields: string | null = null;
    server.use(
      http.post(`${BASE}/pdf/fill-form`, async ({ request }) => {
        const body = await request.text();
        sawFields = extractField(body, "fields");
        return okPdf();
      }),
    );

    const user = userEvent.setup();
    render(<FormFieldsTool />);
    await choosePdf(user);
    await user.click(screen.getByRole("button", { name: "Read form fields" }));

    const nameInput = await screen.findByLabelText("name");
    await user.type(nameInput, "Ada Lovelace");

    await user.click(screen.getByRole("button", { name: "Fill form" }));
    await screen.findByRole("link", { name: /Download/ });

    expect(sawFields).not.toBeNull();
    const parsed = JSON.parse(sawFields ?? "") as Record<string, unknown>;
    expect(parsed).toEqual({ name: "Ada Lovelace" });
  });

  it("surfaces E_INVALID_FIELD verbatim from /pdf/fill-form", async () => {
    server.use(
      http.post(`${BASE}/pdf/form-fields`, () =>
        HttpResponse.json([{ name: "name", type: "text", value: "" }]),
      ),
    );
    server.use(
      http.post(`${BASE}/pdf/fill-form`, () =>
        envelope(400, "E_INVALID_FIELD", 'There is no form field named "nope" in this PDF.'),
      ),
    );

    const user = userEvent.setup();
    render(<FormFieldsTool />);
    await choosePdf(user);
    await user.click(screen.getByRole("button", { name: "Read form fields" }));

    const nameInput = await screen.findByLabelText("name");
    await user.type(nameInput, "x");
    await user.click(screen.getByRole("button", { name: "Fill form" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      'There is no form field named "nope" in this PDF.',
    );
  });
});

describe("CompareTool", () => {
  it("requires exactly two files before it can run", async () => {
    render(<CompareTool />);
    expect(screen.getByRole("button", { name: "Compare" })).toBeDisabled();

    const user = userEvent.setup();
    const input = screen.getByLabelText(/Choose a file, or drop one here/) as HTMLInputElement;
    await user.upload(input, pdfFile("a.pdf"));
    expect(screen.getByRole("button", { name: "Compare" })).toBeDisabled();
  });

  it("renders the page-by-page diff, including extra pages", async () => {
    server.use(
      http.post(`${BASE}/pdf/compare`, () =>
        HttpResponse.json({
          pageCountA: 2,
          pageCountB: 1,
          pages: [
            { page: 1, equal: false, diff: [{ op: "replace", a: ["Hello world"], b: ["Goodbye world"] }] },
          ],
          extraPagesInA: [2],
          extraPagesInB: [],
        }),
      ),
    );

    const user = userEvent.setup();
    render(<CompareTool />);
    const input = screen.getByLabelText(/Choose a file, or drop one here/) as HTMLInputElement;
    await user.upload(input, pdfFile("a.pdf"));
    await user.upload(input, pdfFile("b.pdf"));

    await user.click(screen.getByRole("button", { name: "Compare" }));

    expect(await screen.findByText("Hello world")).toBeInTheDocument();
    expect(screen.getByText("Goodbye world")).toBeInTheDocument();
    expect(screen.getByText(/only exists in the first document/)).toBeInTheDocument();
  });

  it("shows the server's sentence on failure", async () => {
    server.use(
      http.post(`${BASE}/pdf/compare`, () =>
        envelope(400, "E_TOO_FEW_FILES", "Comparing needs exactly two PDF files."),
      ),
    );

    const user = userEvent.setup();
    render(<CompareTool />);
    const input = screen.getByLabelText(/Choose a file, or drop one here/) as HTMLInputElement;
    await user.upload(input, pdfFile("a.pdf"));
    await user.upload(input, pdfFile("b.pdf"));
    await user.click(screen.getByRole("button", { name: "Compare" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Comparing needs exactly two PDF files.",
    );
  });
});
