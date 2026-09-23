/**
 * `/conversions` lists and finds every conversion the site offers - documents,
 * audio and video - not only the document catalog.
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import ConversionsPage from "@/app/conversions/page";
import { ConversionFinder } from "@/components/converter/ConversionFinder";
import { CATALOG } from "@/lib/content/catalog";
import { FINDER_GROUPS, TOTAL_CONVERSIONS } from "@/lib/content/conversionIndex";
import { AUDIO_CATALOG, MEDIA_CATALOG, VIDEO_CATALOG } from "@/lib/media/mediaCatalog";

function hrefs(container: HTMLElement): Set<string> {
  return new Set(
    [...container.querySelectorAll("a[href]")].map((anchor) => anchor.getAttribute("href") ?? ""),
  );
}

describe("/conversions page", () => {
  it("links every document, audio and video conversion page in its HTML", () => {
    const { container } = render(ConversionsPage());
    const links = hrefs(container);

    for (const entry of CATALOG) expect(links.has(`/${entry.slug}`), entry.slug).toBe(true);
    for (const entry of MEDIA_CATALOG) expect(links.has(entry.route), entry.route).toBe(true);
  });

  it("counts every conversion in its lede", () => {
    const { container } = render(ConversionsPage());
    expect(TOTAL_CONVERSIONS).toBe(CATALOG.length + AUDIO_CATALOG.length + VIDEO_CATALOG.length);
    expect(container.querySelector(".page-lede")?.textContent).toContain(String(TOTAL_CONVERSIONS));
  });
});

describe("ConversionFinder search", () => {
  it("has a source group for audio and one for video", () => {
    const keys = FINDER_GROUPS.map((group) => group.key);
    expect(keys).toContain("audio");
    expect(keys).toContain("video");
  });

  it.each([
    ["mp3", "MP3"],
    [".flac", "FLAC"],
    ["mkv", "MKV"],
    ["webm", "WEBM"],
  ])("finds the %s source and lists its targets", async (query, label) => {
    const user = userEvent.setup();
    render(<ConversionFinder />);

    await user.type(screen.getByRole("textbox", { name: /search formats/i }), query);
    const sources = screen.getByRole("navigation", { name: /source formats/i });
    await user.click(within(sources).getByRole("button", { name: label }));

    expect(screen.getByText(`${label} converts to`)).toBeTruthy();
    const source = FINDER_GROUPS.flatMap((group) => group.sources).find((s) => s.label === label)!;
    for (const target of source.targets) {
      expect(document.querySelector(`a[href="${target.href}"]`), target.href).not.toBeNull();
    }
  });

  it.each(["audio", "video"])("lists every %s source when the kind itself is searched", async (kind) => {
    const user = userEvent.setup();
    render(<ConversionFinder />);

    await user.type(screen.getByRole("textbox", { name: /search formats/i }), kind);
    const group = FINDER_GROUPS.find((g) => g.key === kind)!;
    const sources = screen.getByRole("navigation", { name: /source formats/i });
    expect(within(sources).getAllByRole("button")).toHaveLength(group.sources.length);
  });

  it("still finds document formats", async () => {
    const user = userEvent.setup();
    render(<ConversionFinder />);

    await user.type(screen.getByRole("textbox", { name: /search formats/i }), "word");
    const sources = screen.getByRole("navigation", { name: /source formats/i });
    expect(within(sources).getByRole("button", { name: "Word" })).toBeTruthy();
  });

  it("says so when nothing matches", async () => {
    const user = userEvent.setup();
    render(<ConversionFinder />);

    await user.type(screen.getByRole("textbox", { name: /search formats/i }), "zzzzqq");
    expect(screen.getByText(/nothing matches/i)).toBeTruthy();
  });
});
