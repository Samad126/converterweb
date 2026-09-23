/**
 * The two standalone extraction tools: `/tools/psd-to-layers` and
 * `/tools/extract-tables`. Both reuse `ConverterShell` locked to their one
 * target and narrowed to their one source group, so the depth here mirrors
 * `tests/converter/locked.test.tsx` rather than reinventing it: a happy path per tool,
 * plus the one fact that actually distinguishes these two from a catalog page
 * — there is no page for them in `lib/content/catalog.ts`.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import ExtractTablesPage from "@/app/tools/extract-tables/page";
import PsdToLayersPage from "@/app/tools/psd-to-layers/page";
import { findEntry } from "@/lib/content/catalog";

import { chooseFile, dropFile } from "../helpers";
import { BASE } from "../msw/handlers";
import { server } from "../msw/server";

describe("/tools/psd-to-layers", () => {
  it("accepts only .psd and converts to layers", async () => {
    server.use(
      http.post(`${BASE}/convert/layers`, () =>
        new HttpResponse("PK\x03\x04 fake zip", {
          status: 200,
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": 'attachment; filename="design.zip"',
          },
        }),
      ),
    );

    render(<PsdToLayersPage />);
    await screen.findByRole("button", { name: /Convert/ });

    expect(screen.queryByRole("radio")).toBeNull();

    const user = userEvent.setup();
    await chooseFile(user, "design.psd");

    const button = screen.getByRole("button", { name: "Convert to PNG (layers)" });
    expect(button).toBeEnabled();
    await user.click(button);

    expect(await screen.findByRole("link", { name: /Download/ })).toHaveAttribute(
      "download",
      "design.zip",
    );
  });

  it("refuses a file that is not a PSD", async () => {
    render(<PsdToLayersPage />);
    await screen.findByRole("button", { name: /Convert/ });

    dropFile("photo.png");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Accepted: .psd.");
  });

  it("is not one of the catalog's own pages", () => {
    expect(findEntry("psd_to_layers")).toBeNull();
  });
});

describe("/tools/extract-tables", () => {
  it("accepts .docx and .docm and converts to tables", async () => {
    server.use(
      http.post(`${BASE}/convert/tables`, () =>
        new HttpResponse("PK\x03\x04 fake xlsx", {
          status: 200,
          headers: {
            "Content-Type":
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": 'attachment; filename="report.xlsx"',
          },
        }),
      ),
    );

    render(<ExtractTablesPage />);
    await screen.findByRole("button", { name: /Convert/ });

    const user = userEvent.setup();
    await chooseFile(user, "report.docx");

    const button = screen.getByRole("button", { name: "Convert to XLSX (tables)" });
    expect(button).toBeEnabled();
    await user.click(button);

    expect(await screen.findByRole("link", { name: /Download/ })).toHaveAttribute(
      "download",
      "report.xlsx",
    );
  });

  it("refuses a file this tool does not take, such as .doc", async () => {
    render(<ExtractTablesPage />);
    await screen.findByRole("button", { name: /Convert/ });

    dropFile("old.doc");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Accepted: .docx, .docm.");
  });

  it("is not one of the catalog's own pages", () => {
    expect(findEntry("word_to_tables")).toBeNull();
  });
});
