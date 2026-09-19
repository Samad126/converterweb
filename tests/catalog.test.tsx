/**
 * The catalog, checked against the matrix.
 *
 * `tests/matrix.test.tsx` keeps the app from holding a table of the conversion
 * matrix, and `lib/catalog.ts` is the one file exempted from it — see the long
 * note there for why. This file is the other half of that bargain, and it
 * matters more than the exemption does: instead of banning extension literals,
 * it checks the catalog against the matrix itself and fails on any disagreement.
 *
 * That is a stronger check than the ban it stands in for. The ban could only say
 * "this file should not mention .docx"; this can say "every extension this file
 * claims to accept really is accepted, every conversion it advertises really is
 * reachable, and every conversion the service supports has a page".
 *
 * The matrix it reads is `tests/msw/matrix.ts` — a faithful copy of what the
 * running service answers, verified against production when it was written. It
 * is test data, not application data: nothing in `app/`, `components/` or `lib/`
 * reads it.
 */
import { describe, expect, it } from "vitest";

import {
  CATALOG,
  POPULAR_SLUGS,
  SLUGS,
  SOURCES,
  findEntry,
  slugFor,
} from "@/lib/catalog";
import type { FormatsResponse, TargetId } from "@/lib/contract";

import { MATRIX } from "./msw/matrix";

/** The service's own view of a source extension. */
const sourceByExtension = new Map(
  // `sources[number]` is inferred from the generated contract.
  (MATRIX.sources as FormatsResponse["sources"]).map((source) => [source.extension, source]),
);

const targetIds = new Set<string>(
  (MATRIX.targets as FormatsResponse["targets"]).map((target) => target.id),
);

/** Every extension the service accepts, in its order. */
const acceptedExtensions = MATRIX.sources.map((source) => source.extension);

describe("the catalog's shape", () => {
  it("has a page for every pair, and is not empty", () => {
    // A sanity check on the arithmetic elsewhere in this file: if the catalog
    // ever collapses to nothing, the loops below would pass vacuously.
    expect(CATALOG.length).toBeGreaterThan(30);
    expect(SLUGS.length).toBe(CATALOG.length);
  });

  it("gives every page a distinct slug in `source_to_target` form", () => {
    const seen = new Set<string>();

    for (const entry of CATALOG) {
      expect(entry.slug, `${entry.slug} is not a source_to_target slug`).toMatch(
        /^[a-z0-9]+_to_[a-z0-9]+$/,
      );
      expect(seen.has(entry.slug), `${entry.slug} is used twice`).toBe(false);
      seen.add(entry.slug);
    }

    expect([...seen].sort()).toEqual([...SLUGS].sort());
  });

  it("derives the slug from the pair rather than storing it separately", () => {
    for (const entry of CATALOG) {
      expect(entry.slug).toBe(slugFor(entry.source.key, entry.target));
    }
  });

  it("has no page for a source and target that are the same format", () => {
    for (const entry of CATALOG) {
      expect(entry.target).not.toBe(entry.source.key);
    }
  });
});

describe("the catalog against the matrix", () => {
  it("only names extensions the service accepts", () => {
    for (const group of SOURCES) {
      expect(group.extensions.length, `${group.key} accepts nothing`).toBeGreaterThan(0);
      for (const extension of group.extensions) {
        expect(
          acceptedExtensions.includes(extension),
          `${group.key} claims ${extension}, which the service does not accept`,
        ).toBe(true);
      }
    }
  });

  it("only names targets the service can produce", () => {
    for (const entry of CATALOG) {
      expect(targetIds.has(entry.target), `${entry.slug} names ${entry.target}`).toBe(true);
    }
  });

  it("only advertises conversions the service can actually perform", () => {
    for (const entry of CATALOG) {
      for (const extension of entry.source.extensions) {
        const source = sourceByExtension.get(extension);
        expect(source, `${entry.slug} claims ${extension} is accepted`).toBeDefined();
        expect(
          source?.targets.includes(entry.target),
          `${entry.slug} advertises ${extension} → ${entry.target}, which is not reachable`,
        ).toBe(true);
      }
    }
  });

  it("groups extensions that genuinely behave identically", () => {
    // Grouping is the whole point of the URL scheme: if `.doc` and `.docx` could
    // reach different targets, `word_to_pdf` would be promising something one of
    // its own extensions cannot do.
    for (const group of SOURCES) {
      const targetSets = group.extensions.map((extension) => {
        const source = sourceByExtension.get(extension);
        return [...(source?.targets ?? [])].sort().join(",");
      });
      const distinct = new Set(targetSets);
      expect(
        distinct.size,
        `${group.key} groups extensions with different targets: ${[...distinct].join(" vs ")}`,
      ).toBe(1);
    }
  });

  it("groups extensions that the service puts in the same family", () => {
    for (const group of SOURCES) {
      for (const extension of group.extensions) {
        expect(
          sourceByExtension.get(extension)?.family,
          `${group.key} claims family ${group.family} for ${extension}`,
        ).toBe(group.family);
      }
    }
  });

  it("has a page for every conversion the service supports", () => {
    // The direction that matters most. Without this, adding a format to the
    // service would quietly leave its pages missing until somebody noticed.
    const expected = SOURCES.flatMap((group) => {
      const first = sourceByExtension.get(group.extensions[0] ?? "");
      return (first?.targets ?? []).map((target) => slugFor(group.key, target));
    });

    expect([...expected].sort()).toEqual([...SLUGS].sort());
  });

  it("never treats PDF as an input", () => {
    // The service has no `.pdf` source, so no page may imply one. This is the
    // expectation every other converter trains people to have, so it is worth
    // asserting rather than assuming.
    expect(acceptedExtensions).not.toContain(".pdf");
    for (const entry of CATALOG) {
      expect(entry.source.extensions).not.toContain(".pdf");
      expect(entry.source.key).not.toBe("pdf");
    }
  });
});

describe("the catalog's copy", () => {
  it("keeps every meta description within the length a search result shows", () => {
    for (const entry of CATALOG) {
      expect(
        entry.description.length,
        `${entry.slug}'s description is ${entry.description.length} characters`,
      ).toBeLessThanOrEqual(160);
      expect(entry.description.length).toBeGreaterThan(70);
    }
  });

  it("gives every page a unique title and description", () => {
    // Two pages sharing a description is the duplicate-content problem the
    // per-pair `angle` exists to prevent, so it is checked rather than assumed.
    for (const field of ["title", "description"] as const) {
      const values = CATALOG.map((entry) => entry[field]);
      expect(new Set(values).size, `two pages share a ${field}`).toBe(values.length);
    }
  });

  it("fills in every field of every page", () => {
    for (const entry of CATALOG) {
      expect(entry.heading).toMatch(/ to /);
      expect(entry.title).toContain(entry.heading);
      expect(entry.lede.length).toBeGreaterThan(80);
      expect(entry.cardBlurb.length).toBeGreaterThan(10);
      expect(entry.angle.length).toBeGreaterThan(60);
      expect(entry.expect.length).toBeGreaterThanOrEqual(3);
      for (const fact of entry.expect) {
        expect(fact.length).toBeGreaterThan(20);
      }
    }
  });

  it("asks every page at least four questions, with real answers", () => {
    for (const entry of CATALOG) {
      expect(entry.faqs.length, `${entry.slug} has too few questions`).toBeGreaterThanOrEqual(4);
      for (const faq of entry.faqs) {
        expect(faq.question.endsWith("?"), `${faq.question} is not a question`).toBe(true);
        expect(faq.answer.length).toBeGreaterThan(40);
      }
    }
  });

  it("names the page's own source extensions in its copy", () => {
    // The extensions a page accepts are the single most useful thing it can say
    // for search, so every page says them.
    for (const entry of CATALOG) {
      const joined = [...entry.expect, ...entry.faqs.map((faq) => faq.answer)].join(" ");
      for (const extension of entry.source.extensions) {
        expect(joined, `${entry.slug} never mentions ${extension}`).toContain(extension);
      }
    }
  });
});

describe("the catalog's helper functions", () => {
  it("finds every slug it publishes, and nothing else", () => {
    for (const slug of SLUGS) {
      expect(findEntry(slug)?.slug).toBe(slug);
    }
    for (const missing of ["pdf_to_word", "word_to_pdf_", "", "nonsense"]) {
      expect(findEntry(missing)).toBeNull();
    }
  });

  it("links its popular entries at pages that exist", () => {
    expect(POPULAR_SLUGS.length).toBeGreaterThan(0);
    for (const slug of POPULAR_SLUGS) {
      expect(findEntry(slug), `POPULAR_SLUGS names ${slug}`).not.toBeNull();
    }
  });
});

/**
 * A guard on the guard.
 *
 * The tests above are only meaningful while the fixture still looks like the
 * service. If `tests/msw/matrix.ts` were ever trimmed for convenience, the
 * "only advertises conversions the service can perform" check would start
 * passing for the wrong reason.
 */
describe("the fixture this file trusts", () => {
  it("still describes a service with many sources and targets", () => {
    expect(MATRIX.sources.length).toBeGreaterThanOrEqual(16);
    expect(MATRIX.targets.length).toBe(14);
  });

  it("still says PDF is an output and not an input", () => {
    expect(MATRIX.sources.map((source) => source.extension)).not.toContain(".pdf");
    expect([...targetIds] as TargetId[]).toContain("pdf");
  });
});
