/**
 * `lib/content/categories.ts` — pure grouping data, no rendering.
 *
 * The one guarantee worth testing: every `PDF_TOOLS` id lands in exactly one
 * category. A new PDF tool that nobody assigns a category to should fail this
 * test, not silently vanish from the homepage and `/pdf`.
 */
import { describe, expect, it } from "vitest";

import { CATEGORIES, CATEGORIZED_PDF_TOOL_IDS } from "@/lib/content/categories";
import { EXTRA_TOOLS } from "@/lib/content/catalog";
import { PDF_TOOLS } from "@/lib/pdf/pdfTools";

describe("CATEGORIES", () => {
  it("assigns every shipped PDF tool to exactly one non-Convert category", () => {
    const shipped = PDF_TOOLS.filter((tool) => tool.route !== null).map((tool) => tool.id);

    expect(new Set(CATEGORIZED_PDF_TOOL_IDS).size).toBe(CATEGORIZED_PDF_TOOL_IDS.length);
    expect([...CATEGORIZED_PDF_TOOL_IDS].sort()).toEqual([...shipped].sort());
  });

  it("puts every extra tool in the Extract category", () => {
    const extract = CATEGORIES.find((c) => c.id === "extract");
    expect(extract?.items.map((item) => item.id).sort()).toEqual(
      EXTRA_TOOLS.map((tool) => tool.id).sort(),
    );
  });

  it("every category item's route resolves to a real, routed tool or catalog entry", () => {
    for (const category of CATEGORIES) {
      expect(category.items.length).toBeGreaterThan(0);
      for (const item of category.items) {
        expect(item.route.startsWith("/")).toBe(true);
      }
    }
  });

  it("has no duplicate category ids", () => {
    const ids = CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
