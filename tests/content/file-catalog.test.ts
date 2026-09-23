import { describe, expect, it } from "vitest";

import { CATALOG } from "@/lib/content/catalog";
import { FILE_CATALOG, FILE_SLUGS } from "@/lib/files/fileCatalog";
import { FILE_MATRIX } from "@/lib/files/fileMatrix";

describe("the file conversion catalog", () => {
  it("gives every page a unique slug that no document page owns", () => {
    expect(new Set(FILE_SLUGS).size).toBe(FILE_SLUGS.length);
    const documentSlugs = new Set(CATALOG.map((entry) => entry.slug));
    for (const slug of FILE_SLUGS) expect(documentSlugs.has(slug), slug).toBe(false);
  });

  it("only lists pairs the backend matrix contains", () => {
    for (const entry of FILE_CATALOG) {
      const reachable = entry.extensions.some((extension) => FILE_MATRIX[extension]?.includes(entry.targetId));
      expect(reachable, entry.slug).toBe(true);
    }
  });

  it("does not repeat a pair the document catalog already covers", () => {
    const covered = new Set(
      CATALOG.flatMap((entry) => entry.source.extensions.map((extension) => `${extension}>${entry.target}`)),
    );
    for (const entry of FILE_CATALOG) {
      for (const extension of entry.extensions) {
        expect(covered.has(`${extension}>${entry.targetId}`), entry.slug).toBe(false);
      }
    }
  });

  it("covers the archive sources, .rar included", () => {
    const sources = new Set(FILE_CATALOG.flatMap((entry) => entry.extensions));
    for (const extension of [".zip", ".7z", ".rar", ".tar", ".iso"]) expect(sources.has(extension)).toBe(true);
  });
});
