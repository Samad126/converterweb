/**
 * `lib/converter/zip.ts` against a real ZIP built in memory with `fflate` — the same
 * library the module itself uses to read one back. No network and no MSW: a
 * `Blob` built straight from bytes we still hold, so a failure here is a
 * failure of the parser and nothing else.
 */
import { describe, expect, it } from "vitest";
import { zipSync } from "fflate";

import { findEntryForFile, parseConvertZip } from "@/lib/converter/zip";

const text = (value: string): Uint8Array => new TextEncoder().encode(value);
const zipBlob = (entries: Record<string, Uint8Array>): Blob =>
  new Blob([zipSync(entries) as unknown as BlobPart]);

describe("parseConvertZip", () => {
  it("reads every entry and leaves errors.json out of them", async () => {
    const blob = zipBlob({
      "01-a.pdf": text("first"),
      "02-b.pdf": text("second"),
      "errors.json": text(JSON.stringify([{ file: "c.docx", code: "x", message: "Nope." }])),
    });

    const parsed = await parseConvertZip(blob);

    expect(parsed.entries.has("01-a.pdf")).toBe(true);
    expect(parsed.entries.has("02-b.pdf")).toBe(true);
    expect(parsed.entries.has("errors.json")).toBe(false);
    expect(new TextDecoder().decode(parsed.entries.get("01-a.pdf"))).toBe("first");
    expect(parsed.errors).toEqual([{ file: "c.docx", code: "x", message: "Nope." }]);
  });

  it("returns no errors when the archive has none", async () => {
    const blob = zipBlob({ "01-a.pdf": text("first") });
    const parsed = await parseConvertZip(blob);
    expect(parsed.errors).toEqual([]);
  });

  it("skips a folder entry (an image target's per-page result)", async () => {
    const blob = zipBlob({
      "01-deck/slide-1.png": text("img1"),
      "01-deck/slide-2.png": text("img2"),
    });
    const parsed = await parseConvertZip(blob);
    expect([...parsed.entries.keys()]).toEqual([
      "01-deck/slide-1.png",
      "01-deck/slide-2.png",
    ]);
  });

  it("is total on a body that is not a well-formed ZIP", async () => {
    const parsed = await parseConvertZip(new Blob(["not a zip"]));
    expect(parsed.entries.size).toBe(0);
    expect(parsed.errors).toEqual([]);
  });
});

describe("findEntryForFile", () => {
  it("matches the numbered entry for the file at that position", () => {
    const names = ["01-a.pdf", "02-b.pdf"];
    expect(findEntryForFile(names, "a.docx", 0)).toBe("01-a.pdf");
    expect(findEntryForFile(names, "b.docx", 1)).toBe("02-b.pdf");
  });

  it("matches a folder entry by its numbered prefix", () => {
    const names = ["01-deck/slide-1.png", "01-deck/slide-2.png"];
    expect(findEntryForFile(names, "deck.pptx", 0)).toBe("01-deck/slide-1.png");
  });

  it("returns null when nothing names the file", () => {
    expect(findEntryForFile(["01-a.pdf"], "missing.docx", 4)).toBeNull();
  });
});
