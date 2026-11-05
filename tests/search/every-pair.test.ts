import { describe, expect, it } from "vitest";
import { CATALOG } from "@/lib/content/catalog";
import { FILE_CATALOG } from "@/lib/files/fileCatalog";
import { FILE_TARGETS } from "@/lib/files/fileMatrix";
import { MEDIA_CATALOG } from "@/lib/media/mediaCatalog";
import { buildSearchIndex } from "@/lib/search/buildIndex";
import { searchItems } from "@/lib/search/rank";
import { MATRIX } from "../msw/matrix";

const INDEX = buildSearchIndex(MATRIX);

/** Every "<source> to <target>" a person could type, for every page, each source spelling. */
function queriesFor(): { query: string; route: string }[] {
  const out: { query: string; route: string }[] = [];
  for (const entry of FILE_CATALOG) {
    const targetExt = (FILE_TARGETS[entry.targetId]?.extension ?? "").replace(/^\./, "").replace(/^.*\./, "");
    for (const ext of entry.extensions) {
      const source = ext.replace(/^\./, "");
      for (const target of new Set([targetExt, entry.targetLabel.toLowerCase()])) {
        out.push({ query: `${source} to ${target}`, route: entry.route });
      }
    }
  }
  for (const entry of CATALOG) {
    for (const ext of entry.source.extensions) {
      out.push({ query: `${ext.slice(1)} to ${entry.target}`, route: `/${entry.slug}` });
    }
  }
  for (const entry of MEDIA_CATALOG) {
    out.push({ query: `${entry.source.extension.slice(1)} to ${entry.target.extension.slice(1)}`, route: entry.route });
  }
  return out;
}

describe("header search finds every conversion page", () => {
  it("returns the page for every spelled-out pair", () => {
    const missing = queriesFor()
      .filter(({ query, route }) => !searchItems(INDEX, query).some((r) => r.item.route === route))
      .map(({ query, route }) => `${query} -> ${route}`);
    expect(missing).toEqual([]);
  }, 60_000);

  it("finds JPEG to PNG and JPEG to JPG", () => {
    const routes = (q: string) => searchItems(INDEX, q).map((r) => r.item.route);
    expect(routes("jpeg to png")[0]).toBe("/files/jpeg_to_png");
    expect(routes("jpeg to pdf")).toContain("/files/jpeg_to_pdf");
    expect(routes("jpg to png")[0]).toBe("/files/jpg_to_png_image");
    expect(routes("jpeg to jpg")).toContain("/files/jpeg_to_jpg");
  });
});
