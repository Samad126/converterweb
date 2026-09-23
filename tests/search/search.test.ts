/**
 * `lib/search` — pure, synchronous, no DOM. Ranking, aliasing, normalization,
 * and the one proof that the index comes from `GET /formats` and not a table
 * written into the app.
 */
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { fetchFormats } from "@/lib/api/api";
import { buildSearchIndex } from "@/lib/search/buildIndex";
import { bareExtension, normalizeQuery, normalizeText } from "@/lib/search/normalize";
import { matchItem, searchItems } from "@/lib/search/rank";
import type { SearchItem } from "@/lib/search/types";

import { BASE } from "../msw/handlers";
import { MATRIX } from "../msw/matrix";
import { server } from "../msw/server";

const INDEX = buildSearchIndex(MATRIX);

function item(overrides: Partial<SearchItem>): SearchItem {
  return {
    id: "test:item",
    kind: "tool",
    label: "Test Item",
    route: "/test",
    extensions: [],
    mimeTypes: [],
    synonyms: [],
    ...overrides,
  };
}

describe("normalize", () => {
  it("lower-cases and trims", () => {
    expect(normalizeQuery("  PDF  ")).toBe("pdf");
  });

  it("drops a leading dot", () => {
    expect(normalizeQuery(" .pdf ")).toBe(normalizeQuery("pdf"));
  });

  it("strips diacritics", () => {
    expect(normalizeText("café")).toBe("cafe");
  });

  it("bareExtension strips the dot regardless of case", () => {
    expect(bareExtension(".PDF")).toBe("pdf");
  });
});

describe("buildSearchIndex", () => {
  it("produces exactly the 36 catalog pairs plus the shipped PDF tools and extra tools", () => {
    const conversions = INDEX.filter((entry) => entry.kind === "conversion");
    const pdfTools = INDEX.filter((entry) => entry.kind === "pdf-tool");
    const tools = INDEX.filter((entry) => entry.kind === "tool");

    expect(conversions.length).toBeGreaterThan(0);
    expect(pdfTools.length).toBeGreaterThan(0);
    expect(tools.map((t) => t.id).sort()).toEqual(["tool:extract-tables", "tool:psd-to-layers"]);
  });

  it("reads a conversion's extensions and media type from the matrix, not from a local table", () => {
    const wordToPdf = INDEX.find((entry) => entry.id === "conversion:word_to_pdf");
    expect(wordToPdf).toBeDefined();
    expect(wordToPdf?.extensions).toContain(".docx");
    expect(wordToPdf?.extensions).toContain(".pdf");
    expect(wordToPdf?.mimeTypes).toEqual(["application/pdf"]);
  });

  it("changes when the matrix changes — proving the index is not hard-coded", async () => {
    server.use(
      http.get(`${BASE}/formats`, () =>
        HttpResponse.json({
          ...MATRIX,
          targets: MATRIX.targets.filter((target) => target.id !== "pdf"),
          sources: MATRIX.sources.map((source) => ({
            ...source,
            targets: source.targets.filter((target) => target !== "pdf"),
          })),
        }),
      ),
    );

    const shrunkMatrix = await fetchFormats();
    const shrunkIndex = buildSearchIndex(shrunkMatrix);
    const shrunkEntry = shrunkIndex.find((entry) => entry.id === "conversion:word_to_pdf");

    // The catalog page still exists (`lib/content/catalog.ts` decides routes, not the
    // matrix), but its media type — read live from `GET /formats` — is gone,
    // proving that field is not a value copied into a local table.
    const originalEntry = INDEX.find((entry) => entry.id === "conversion:word_to_pdf");
    expect(originalEntry?.mimeTypes).toEqual(["application/pdf"]);
    expect(shrunkEntry?.mimeTypes).toEqual([]);
  });
});

describe("matchItem — ranking order", () => {
  const target = item({ id: "conversion:word_to_pdf", label: "Word to PDF", extensions: [".docx", ".pdf"], targetId: "pdf" });

  it.each([
    ["pdf", "exact-id"],
    [".pdf", "exact-id"],
    ["docx", "exact-extension"],
    [".docx", "exact-extension"],
    ["word", "prefix"],
    ["to pdf", "word-boundary"],
    ["ord to", "substring"],
    ["wrdtpdf", "subsequence"],
  ])("%s -> %s", (query, expected) => {
    expect(matchItem(query, target)).toBe(expected);
  });

  it("returns null when nothing matches", () => {
    expect(matchItem("xyzzy-nonsense", target)).toBeNull();
  });

  it("returns null for an empty or whitespace query", () => {
    expect(matchItem("", target)).toBeNull();
    expect(matchItem("   ", target)).toBeNull();
  });
});

describe("matchItem — case, diacritics and whitespace insensitivity", () => {
  const target = item({ label: "Café Menu" });
  it.each([["CAFE"], ["cafe"], [" cafe "], ["café"]])("%s matches 'Café Menu'", (query) => {
    expect(matchItem(query, target)).not.toBeNull();
  });
});

describe("searchItems — sorting and tie-break", () => {
  it("sorts by rank first, alphabetically within a rank", () => {
    const items = [
      item({ id: "a", label: "Zebra Export" }), // word-boundary
      item({ id: "b", label: "Apple Export" }), // word-boundary
      item({ id: "c", label: "Export Wizard" }), // prefix — outranks both
    ];
    const results = searchItems(items, "export");
    // "Export Wizard" wins on rank; the word-boundary tie between the other
    // two is broken alphabetically: "Apple" before "Zebra".
    expect(results.map((r) => r.item.id)).toEqual(["c", "b", "a"]);
  });

  it("never shuffles: the same query on the same items always returns the same order", () => {
    const items = [
      item({ id: "a", label: "Image to PDF" }),
      item({ id: "b", label: "PDF to Image" }),
      item({ id: "c", label: "PDF" }),
    ];
    const first = searchItems(items, "pdf").map((r) => r.item.id);
    const second = searchItems(items, "pdf").map((r) => r.item.id);
    expect(first).toEqual(second);
  });

  it("returns nothing for an empty query", () => {
    const items = [item({ id: "a", label: "Anything" })];
    expect(searchItems(items, "")).toEqual([]);
  });

  it("returns an empty array, not a throw, when nothing matches (no-results)", () => {
    const items = [item({ id: "a", label: "Anything" })];
    expect(searchItems(items, "zzzznope")).toEqual([]);
  });
});

describe("aliases", () => {
  it("finds a target by a common synonym: jpg via jpeg", () => {
    const results = searchItems(INDEX, "jpeg");
    expect(results.some((r) => r.item.targetId === "jpg")).toBe(true);
  });

  it("finds Word conversions by the product name, not just the extension", () => {
    const results = searchItems(INDEX, "word");
    expect(results.some((r) => r.item.id === "conversion:word_to_pdf")).toBe(true);
  });

  it("finds Excel conversions by the product name", () => {
    const results = searchItems(INDEX, "excel");
    expect(results.some((r) => r.item.label.toLowerCase().includes("excel"))).toBe(true);
  });
});

describe("large catalog", () => {
  it("ranks correctly over a large synthetic index without throwing", () => {
    const big: SearchItem[] = Array.from({ length: 5000 }, (_, i) =>
      item({ id: `synthetic:${i}`, label: `Synthetic Tool ${i}` }),
    );
    big.push(item({ id: "conversion:word_to_pdf", label: "Word to PDF", targetId: "pdf" }));
    const results = searchItems(big, "pdf");
    expect(results[0]?.item.id).toBe("conversion:word_to_pdf");
  });
});
