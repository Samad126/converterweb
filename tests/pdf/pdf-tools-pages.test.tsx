/**
 * The thirteen single-file `/pdf/*` page tools built on `usePdfFileTool` and
 * `PdfToolShell`. Same depth as `tests/pdf/pdf-tools.test.tsx`: a happy path, a
 * server error shown verbatim, and at least one option field actually going
 * out on the wire, per tool.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { CropTool } from "@/components/pdf/CropTool";
import { ExtractPagesTool } from "@/components/pdf/ExtractPagesTool";
import { OrganizeTool } from "@/components/pdf/OrganizeTool";
import { PageNumbersTool } from "@/components/pdf/PageNumbersTool";
import { ProtectTool } from "@/components/pdf/ProtectTool";
import { RemovePagesTool } from "@/components/pdf/RemovePagesTool";
import { RepairTool } from "@/components/pdf/RepairTool";
import { RotateTool } from "@/components/pdf/RotateTool";
import { SplitTool } from "@/components/pdf/SplitTool";
import { UnlockTool } from "@/components/pdf/UnlockTool";
import { WatermarkTool } from "@/components/pdf/WatermarkTool";

import { BASE, envelope } from "../msw/handlers";
import { server } from "../msw/server";

function pdfFile(name = "doc.pdf"): File {
  return new File(["%PDF-1.4 fake"], name, { type: "application/pdf" });
}

async function choosePdf(user: ReturnType<typeof userEvent.setup>, name = "doc.pdf"): Promise<void> {
  const input = screen.getByLabelText(/Choose a file, or drop one here/) as HTMLInputElement;
  await user.upload(input, pdfFile(name));
}

function okPdf(body = "%PDF-1.4 result", filename = "result.pdf") {
  return new HttpResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

describe("RemovePagesTool", () => {
  it("sends the page list and downloads the result", async () => {
    let sawPages = false;
    server.use(
      http.post(`${BASE}/pdf/remove-pages`, async ({ request }) => {
        const body = await request.text();
        sawPages = /name="pages"/.test(body) && /2,5-7/.test(body);
        return okPdf();
      }),
    );
    const user = userEvent.setup();
    render(<RemovePagesTool />);
    await choosePdf(user);
    await user.type(screen.getByPlaceholderText("2,5-7,10"), "2,5-7");
    await user.click(screen.getByRole("button", { name: "Run" }));
    await screen.findByRole("link", { name: /Download/ });
    expect(sawPages).toBe(true);
  });

  it("shows the server's sentence on failure", async () => {
    server.use(
      http.post(`${BASE}/pdf/remove-pages`, () =>
        envelope(400, "E_BAD_PAGE_RANGE", "Removing every page is refused."),
      ),
    );
    const user = userEvent.setup();
    render(<RemovePagesTool />);
    await choosePdf(user);
    await user.type(screen.getByPlaceholderText("2,5-7,10"), "1-99");
    await user.click(screen.getByRole("button", { name: "Run" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Removing every page is refused.");
  });
});

describe("ExtractPagesTool", () => {
  it("sends the page list and downloads the result", async () => {
    let sawPages = false;
    server.use(
      http.post(`${BASE}/pdf/extract-pages`, async ({ request }) => {
        const body = await request.text();
        sawPages = /name="pages"/.test(body) && /3,1,2/.test(body);
        return okPdf();
      }),
    );
    const user = userEvent.setup();
    render(<ExtractPagesTool />);
    await choosePdf(user);
    await user.type(screen.getByPlaceholderText("1,3-4"), "3,1,2");
    await user.click(screen.getByRole("button", { name: "Run" }));
    await screen.findByRole("link", { name: /Download/ });
    expect(sawPages).toBe(true);
  });

  it("shows the server's sentence on failure", async () => {
    server.use(
      http.post(`${BASE}/pdf/extract-pages`, () =>
        envelope(400, "E_BAD_PAGE_RANGE", "That page range names no pages."),
      ),
    );
    const user = userEvent.setup();
    render(<ExtractPagesTool />);
    await choosePdf(user);
    await user.click(screen.getByRole("button", { name: "Run" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That page range names no pages.");
  });
});

describe("OrganizeTool", () => {
  it("sends the new order and downloads the result", async () => {
    let sawOrder = false;
    server.use(
      http.post(`${BASE}/pdf/organize`, async ({ request }) => {
        const body = await request.text();
        sawOrder = /name="order"/.test(body) && /3,1,2/.test(body);
        return okPdf();
      }),
    );
    const user = userEvent.setup();
    render(<OrganizeTool />);
    await choosePdf(user);
    await user.type(screen.getByPlaceholderText("3,1,2"), "3,1,2");
    await user.click(screen.getByRole("button", { name: "Run" }));
    await screen.findByRole("link", { name: /Download/ });
    expect(sawOrder).toBe(true);
  });

  it("shows the server's sentence on failure", async () => {
    server.use(
      http.post(`${BASE}/pdf/organize`, () =>
        envelope(400, "E_BAD_PAGE_RANGE", "Every page must be named exactly once."),
      ),
    );
    const user = userEvent.setup();
    render(<OrganizeTool />);
    await choosePdf(user);
    await user.click(screen.getByRole("button", { name: "Run" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Every page must be named exactly once.",
    );
  });
});

describe("RotateTool", () => {
  it("sends degrees, and pages only when given, and downloads the result", async () => {
    let sawDegrees = false;
    let sawPages = false;
    server.use(
      http.post(`${BASE}/pdf/rotate`, async ({ request }) => {
        const body = await request.text();
        sawDegrees = /name="degrees"/.test(body) && /90/.test(body);
        sawPages = /name="pages"/.test(body);
        return okPdf();
      }),
    );
    const user = userEvent.setup();
    render(<RotateTool />);
    await choosePdf(user);
    await user.click(screen.getByRole("button", { name: "Run" }));
    await screen.findByRole("link", { name: /Download/ });
    expect(sawDegrees).toBe(true);
    expect(sawPages).toBe(false);
  });

  it("shows the server's sentence on failure", async () => {
    server.use(
      http.post(`${BASE}/pdf/rotate`, () => envelope(400, "E_INVALID_FIELD", "degrees must be a multiple of 90.")),
    );
    const user = userEvent.setup();
    render(<RotateTool />);
    await choosePdf(user);
    await user.click(screen.getByRole("button", { name: "Run" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("degrees must be a multiple of 90.");
  });
});

describe("WatermarkTool", () => {
  it("sends the watermark text and downloads the result", async () => {
    let sawText = false;
    server.use(
      http.post(`${BASE}/pdf/watermark`, async ({ request }) => {
        const body = await request.text();
        sawText = /name="text"/.test(body) && /CONFIDENTIAL/.test(body);
        return okPdf();
      }),
    );
    const user = userEvent.setup();
    render(<WatermarkTool />);
    await choosePdf(user);
    await user.type(screen.getByPlaceholderText("CONFIDENTIAL"), "CONFIDENTIAL");
    await user.click(screen.getByRole("button", { name: "Run" }));
    await screen.findByRole("link", { name: /Download/ });
    expect(sawText).toBe(true);
  });

  it("shows the server's sentence on failure", async () => {
    server.use(
      http.post(`${BASE}/pdf/watermark`, () => envelope(422, "E_ENCRYPTED", "This PDF is password protected.")),
    );
    const user = userEvent.setup();
    render(<WatermarkTool />);
    await choosePdf(user);
    await user.type(screen.getByPlaceholderText("CONFIDENTIAL"), "DRAFT");
    await user.click(screen.getByRole("button", { name: "Run" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("This PDF is password protected.");
  });
});

describe("ProtectTool", () => {
  it("sends the password and downloads the result", async () => {
    let sawPassword = false;
    server.use(
      http.post(`${BASE}/pdf/protect`, async ({ request }) => {
        const body = await request.text();
        sawPassword = /name="password"/.test(body) && /hunter2/.test(body);
        return okPdf();
      }),
    );
    const user = userEvent.setup();
    render(<ProtectTool />);
    await choosePdf(user);
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.click(screen.getByRole("button", { name: "Run" }));
    await screen.findByRole("link", { name: /Download/ });
    expect(sawPassword).toBe(true);
  });

  it("shows the server's sentence on failure", async () => {
    server.use(
      http.post(`${BASE}/pdf/protect`, () => envelope(422, "E_BAD_REQUEST", "This PDF is already encrypted.")),
    );
    const user = userEvent.setup();
    render(<ProtectTool />);
    await choosePdf(user);
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.click(screen.getByRole("button", { name: "Run" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("This PDF is already encrypted.");
  });
});

describe("UnlockTool", () => {
  it("sends the password and downloads the result", async () => {
    let sawPassword = false;
    server.use(
      http.post(`${BASE}/pdf/unlock`, async ({ request }) => {
        const body = await request.text();
        sawPassword = /name="password"/.test(body) && /hunter2/.test(body);
        return okPdf();
      }),
    );
    const user = userEvent.setup();
    render(<UnlockTool />);
    await choosePdf(user);
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.click(screen.getByRole("button", { name: "Run" }));
    await screen.findByRole("link", { name: /Download/ });
    expect(sawPassword).toBe(true);
  });

  it("shows the server's sentence on failure", async () => {
    server.use(
      http.post(`${BASE}/pdf/unlock`, () => envelope(422, "E_WRONG_PASSWORD", "That password does not open this file.")),
    );
    const user = userEvent.setup();
    render(<UnlockTool />);
    await choosePdf(user);
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Run" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That password does not open this file.");
  });
});

describe("CropTool", () => {
  it("sends only the fields filled in and downloads the result", async () => {
    let sawLeft = false;
    let sawRight = false;
    server.use(
      http.post(`${BASE}/pdf/crop`, async ({ request }) => {
        const body = await request.text();
        sawLeft = /name="left"/.test(body) && /10/.test(body);
        sawRight = /name="right"/.test(body);
        return okPdf();
      }),
    );
    const user = userEvent.setup();
    render(<CropTool />);
    await choosePdf(user);
    await user.type(screen.getByLabelText("Left (points)"), "10");
    await user.click(screen.getByRole("button", { name: "Run" }));
    await screen.findByRole("link", { name: /Download/ });
    expect(sawLeft).toBe(true);
    expect(sawRight).toBe(false);
  });

  it("shows the server's sentence on failure", async () => {
    server.use(
      http.post(`${BASE}/pdf/crop`, () => envelope(400, "E_INVALID_FIELD", "left must not be negative.")),
    );
    const user = userEvent.setup();
    render(<CropTool />);
    await choosePdf(user);
    await user.click(screen.getByRole("button", { name: "Run" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("left must not be negative.");
  });
});

describe("PageNumbersTool", () => {
  it("sends the position and start value and downloads the result", async () => {
    let sawPosition = false;
    let sawStart = false;
    server.use(
      http.post(`${BASE}/pdf/page-numbers`, async ({ request }) => {
        const body = await request.text();
        sawPosition = /name="position"/.test(body) && /bottom-right/.test(body);
        sawStart = /name="startAt"/.test(body);
        return okPdf();
      }),
    );
    const user = userEvent.setup();
    render(<PageNumbersTool />);
    await choosePdf(user);
    await user.click(screen.getByRole("radio", { name: "Bottom right" }));
    await user.click(screen.getByRole("button", { name: "Run" }));
    await screen.findByRole("link", { name: /Download/ });
    expect(sawPosition).toBe(true);
    expect(sawStart).toBe(true);
  });

  it("shows the server's sentence on failure", async () => {
    server.use(
      http.post(`${BASE}/pdf/page-numbers`, () => envelope(400, "E_INVALID_FIELD", "startAt must not be negative.")),
    );
    const user = userEvent.setup();
    render(<PageNumbersTool />);
    await choosePdf(user);
    await user.click(screen.getByRole("button", { name: "Run" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("startAt must not be negative.");
  });
});

describe("RepairTool", () => {
  it("has no fields, and downloads the result", async () => {
    server.use(http.post(`${BASE}/pdf/repair`, () => okPdf()));
    const user = userEvent.setup();
    render(<RepairTool />);
    await choosePdf(user);
    await user.click(screen.getByRole("button", { name: "Run" }));
    await screen.findByRole("link", { name: /Download/ });
  });

  it("shows the server's sentence on failure", async () => {
    server.use(
      http.post(`${BASE}/pdf/repair`, () => envelope(422, "E_CONVERT_FAILED", "This PDF could not be repaired.")),
    );
    const user = userEvent.setup();
    render(<RepairTool />);
    await choosePdf(user);
    await user.click(screen.getByRole("button", { name: "Run" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("This PDF could not be repaired.");
  });
});

describe("SplitTool", () => {
  it("sends the page count and downloads the ZIP", async () => {
    let sawEvery = false;
    server.use(
      http.post(`${BASE}/pdf/split`, async ({ request }) => {
        const body = await request.text();
        sawEvery = /name="every"/.test(body) && /\b3\b/.test(body);
        return new HttpResponse("PK\x03\x04 fake zip", {
          status: 200,
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": 'attachment; filename="parts.zip"',
          },
        });
      }),
    );
    const user = userEvent.setup();
    render(<SplitTool />);
    await choosePdf(user);
    const input = screen.getByLabelText("Pages per output file");
    await user.clear(input);
    await user.type(input, "3");
    await user.click(screen.getByRole("button", { name: "Run" }));

    const download = await screen.findByRole("link", { name: /Download/ });
    expect(download).toHaveAttribute("download", "parts.zip");
    expect(sawEvery).toBe(true);
  });

  it("shows the server's sentence on failure", async () => {
    server.use(
      http.post(`${BASE}/pdf/split`, () => envelope(400, "E_BAD_PAGE_RANGE", "every must be a positive whole number.")),
    );
    const user = userEvent.setup();
    render(<SplitTool />);
    await choosePdf(user);
    await user.click(screen.getByRole("button", { name: "Run" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "every must be a positive whole number.",
    );
  });
});
