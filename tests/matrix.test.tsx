/**
 * The matrix is fetched, never remembered.
 *
 * Two proofs, and they are deliberately different in kind:
 *
 *   1. Behavioural. A fabricated matrix — labels, extensions and reachable
 *      targets that no build of this app has ever seen — is served, and the
 *      picker follows it. An app with the real table compiled into it cannot
 *      pass this.
 *   2. Structural. No source file outside the generated API types names a file
 *      extension the service accepts. A hard-coded matrix has to spell them
 *      out; nothing here does.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import type { FormatsResponse } from "@/lib/contract";
import { formatList } from "@/lib/formats";

import { BASE } from "./msw/handlers";
import { MATRIX } from "./msw/matrix";
import { server } from "./msw/server";
import { chooseFile, chooseFormat, dropFile, formatChip, formatRadio, setupPage } from "./helpers";

/** Every extension the running service accepts, for the structural check. */
const ACCEPTED_EXTENSIONS = MATRIX.sources.map((source) => source.extension);

/** The radios, in the order they are rendered. */
function renderedOrder(): string[] {
  return screen
    .getAllByRole("radio")
    .map((radio) => (radio as HTMLInputElement).value);
}

describe("the picker follows GET /formats", () => {
  it("disables the targets a Word document cannot become, with a derived reason", async () => {
    const user = await setupPage();
    await chooseFile(user, "Quarterly report.docx");

    // The service says this source reaches exactly these; everything else in
    // the target list is shown, disabled, and explains itself.
    for (const id of ["pdf", "odt", "txt", "html", "rtf", "epub"]) {
      expect(formatRadio(id === "odt" ? "ODT" : id.toUpperCase())).toBeEnabled();
    }

    for (const [label, id] of [
      ["PNG", "png"],
      ["JPG", "jpg"],
      ["XLSX", "xlsx"],
      ["ODS", "ods"],
      ["CSV", "csv"],
      ["ODP", "odp"],
      ["PPTX", "pptx"],
    ] as const) {
      expect(formatRadio(label)).toBeDisabled();
      // The reason is read out of the same response: which sources can reach it.
      const expected = formatList(
        MATRIX.sources
          .filter((source) => source.targets.includes(id))
          .map((source) => source.extension),
      );
      expect(formatChip(label)).toHaveTextContent(`Only from ${expected}.`);
    }
  });

  it("enables the image targets for a presentation and disables the document ones", async () => {
    const user = await setupPage();
    await chooseFile(user, "Deck.pptx");

    expect(formatRadio("PNG")).toBeEnabled();
    expect(formatRadio("JPG")).toBeEnabled();
    expect(formatRadio("PDF")).toBeEnabled();
    expect(formatRadio("ODP")).toBeEnabled();

    expect(formatRadio("TXT")).toBeDisabled();
    expect(formatRadio("DOCX")).toBeDisabled();
    expect(formatRadio("XLSX")).toBeDisabled();
  });

  it("re-evaluates when the file changes, and drops a target that no longer fits", async () => {
    const user = await setupPage();

    await chooseFile(user, "Deck.pptx");
    expect(formatRadio("PNG")).toBeEnabled();

    await chooseFormat(user, "PNG");
    expect(formatRadio("PNG")).toBeChecked();

    // Swapping the file means removing it first: the drop zone is replaced by
    // the chosen file's row, which is where the choice is undone.
    await user.click(screen.getByRole("button", { name: "Remove" }));
    await chooseFile(user, "Quarterly report.docx");

    // A Word document cannot become a PNG, so the choice is not carried over.
    expect(formatRadio("PNG")).toBeDisabled();
    expect(formatRadio("PDF")).not.toBeChecked();
  });

  it("renders the targets in the server's order, not alphabetically", async () => {
    await setupPage();
    const order = renderedOrder();
    // Straight out of the fixture, which is straight out of the service.
    expect(order).toEqual(MATRIX.targets.map((target) => target.id));

    // And that order is not alphabetical, so the assertion above means
    // something: sorted, "csv" would come first.
    expect(order).not.toEqual([...order].sort());
  });
});

describe("a matrix this build has never seen", () => {
  /**
   * Nothing in this fixture matches the real service: different extensions,
   * different labels, different reachability, a different order. If any part of
   * the app remembered the real table, this is where it would show.
   */
  const SYNTHETIC: FormatsResponse = {
    targets: [
      {
        id: "html",
        extension: ".html",
        mediaType: "text/html; charset=utf-8",
        label: "Web page",
        multiple: false,
      },
      {
        id: "csv",
        extension: ".csv",
        mediaType: "text/csv; charset=utf-8",
        label: "Comma separated",
        multiple: false,
      },
      {
        id: "jpg",
        extension: ".jpg",
        mediaType: "image/jpeg",
        label: "JPEG",
        multiple: true,
      },
      {
        id: "epub",
        extension: ".epub",
        mediaType: "application/epub+zip",
        label: "E-book",
        multiple: false,
      },
    ],
    sources: [
      {
        extension: ".docx",
        mediaType: "application/vnd.example.word",
        family: "writer",
        targets: ["html"],
      },
      {
        extension: ".xlsx",
        mediaType: "application/vnd.example.sheet",
        family: "calc",
        targets: ["html", "csv", "jpg"],
      },
    ],
  };

  it("builds the picker from whatever the server sends", async () => {
    server.use(http.get(`${BASE}/formats`, () => HttpResponse.json(SYNTHETIC)));

    const user = await setupPage();
    await chooseFile(user, "a.docx");

    // The labels are the server's, in the server's order.
    expect(screen.getByRole("radio", { name: /^Web page\b/ })).toBeEnabled();
    expect(renderedOrder()).toEqual(["html", "csv", "jpg", "epub"]);

    // `csv` and `jpg` are reachable — from `.xlsx`, which this file is not.
    expect(screen.getByRole("radio", { name: /^Comma separated\b/ })).toBeDisabled();
    expect(formatChip("Comma separated")).toHaveTextContent("Only from .xlsx.");
    expect(screen.getByRole("radio", { name: /^JPEG\b/ })).toBeDisabled();

    // `epub` is reachable from nothing at all in this matrix.
    expect(formatChip("E-book")).toHaveTextContent(
      "This converter cannot produce it from any file type.",
    );
  });

  it("refuses a file this matrix does not list, naming the ones it does", async () => {
    server.use(http.get(`${BASE}/formats`, () => HttpResponse.json(SYNTHETIC)));

    await setupPage();
    // A real matrix accepts this; this one does not, and the app must agree
    // with the server rather than with its own memory. Dropped rather than
    // picked, because the input's `accept` list is the synthetic one too and
    // would filter the file out before the app ever saw it.
    dropFile("Deck.pptx");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Deck.pptx is a .pptx file, which this converter does not accept.",
    );
    expect(alert).toHaveTextContent("Accepted: .docx, .xlsx.");
  });

  it("advertises the server's extensions in the file input", async () => {
    server.use(http.get(`${BASE}/formats`, () => HttpResponse.json(SYNTHETIC)));

    await setupPage();
    expect(
      document.querySelector<HTMLInputElement>('input[type="file"]'),
    ).toHaveAttribute("accept", ".docx,.xlsx");
  });
});

describe("no hard-coded matrix", () => {
  const APP_DIRECTORIES = ["app", "components", "lib"];
  /** Generated from `openapi.json`; it is the contract, not a table we keep. */
  const GENERATED = "lib/api-types.ts";

  /**
   * The one file allowed to name an extension, and the reasoning.
   *
   * The rule this test enforces is that the app must never decide *what can
   * become what* from a table of its own — that answer belongs to `GET /formats`
   * alone, so that teaching the service a new format does not require teaching
   * the client one too. The test approximates that rule by banning extension
   * literals outright, which is a good proxy for `lib/formats.ts`,
   * `components/FormatPicker.tsx` and everywhere else the UI reasons about
   * formats.
   *
   * `lib/catalog.ts` is the exception, and it is a deliberate one. It is the
   * editorial layer behind the per-conversion pages: thirty-six pages that each
   * have to say, in static HTML, "Files accepted: .docx, .doc and .docm" — a
   * sentence a crawler has to be able to read without running any JavaScript,
   * which rules out reading it from the service at render time. Prose that names
   * the formats it accepts cannot avoid naming formats.
   *
   * What it still may not do is claim a capability, and that is enforced three
   * other ways rather than by this ban:
   *
   *   - `tests/catalog.test.tsx` checks every extension and every pair in the
   *     catalog against the matrix fixture, exhaustively and in both
   *     directions. That is a *direct* check of the thing this literal ban only
   *     approximates, which is why exempting one file here is not a hole.
   *   - `target` is a `TargetId` generated from the contract, so a target the
   *     service does not define is a compile error.
   *   - Every page resolves reachability through `isReachable` against the live
   *     matrix before it offers a conversion, so a catalog that has gone stale
   *     shows a disabled format and the server's own reason rather than a
   *     button that fails.
   */
  /**
   * `lib/catalog.ts` composes the prose for the thirty-six catalog pages, and
   * these two pages are its standalone cousins: `/tools/psd-to-layers` and
   * `/tools/extract-tables` are one-off extraction tools that deliberately do
   * not go through the catalog (see the note there), but they still have to
   * say, in static HTML, which extensions they take — the same crawler-facing
   * reason `lib/catalog.ts` is exempted for.
   */
  const EDITORIAL = new Set([
    "lib/catalog.ts",
    "app/tools/psd-to-layers/page.tsx",
    "app/tools/extract-tables/page.tsx",
    // `/pdf/scan-to-pdf` takes images, not a conversion-matrix source: its
    // accepted extensions (`lib/pdfApi.ts`'s toolkit has no `GET /formats`
    // equivalent — see the note there) are fixed by the service's own
    // `/pdf/scan-to-pdf` contract, not by the matrix this test guards.
    "components/pdf/ScanToPdfTool.tsx",
  ]);

  function sourceFiles(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(path);
      return /\.tsx?$/.test(entry.name) ? [path] : [];
    });
  }

  it("names no accepted file extension anywhere outside the generated types", () => {
    const files = APP_DIRECTORIES.flatMap(sourceFiles).filter((file) => {
      const relativePath = relative(process.cwd(), file);
      return relativePath !== GENERATED && !EDITORIAL.has(relativePath);
    });
    expect(files.length).toBeGreaterThan(10);

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const extension of ACCEPTED_EXTENSIONS) {
        // The escape keeps `.doc` from matching inside `.docx`, which would
        // make the failure message point at the wrong extension.
        expect(
          new RegExp(`\\${extension}(?![a-z0-9])`).test(source),
          `${relative(process.cwd(), file)} names ${extension}`,
        ).toBe(false);
      }
    }
  });
});
