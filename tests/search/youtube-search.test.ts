/**
 * The YouTube pages in the search index. People type `yt` as often as
 * `youtube`, and neither is a file format, so they are matched by label and by
 * synonym rather than by extension.
 */
import { describe, expect, it } from "vitest";

import { buildSearchIndex } from "@/lib/search/buildIndex";
import { searchItems } from "@/lib/search/rank";

import { MATRIX } from "../msw/matrix";

const INDEX = buildSearchIndex(MATRIX);

function routesFor(query: string): string[] {
  return searchItems(INDEX, query).map((result) => result.item.route);
}

describe("searching for YouTube", () => {
  it("finds both YouTube pages by the word YouTube", () => {
    const routes = routesFor("youtube");
    expect(routes).toContain("/youtube-to-mp3");
    expect(routes).toContain("/youtube-to-mp4");
  });

  it("finds them by yt, the abbreviation people type", () => {
    const routes = routesFor("yt");
    expect(routes).toContain("/youtube-to-mp3");
    expect(routes).toContain("/youtube-to-mp4");
  });

  it("finds the MP3 page for a YouTube-to-MP3 query, and not only the audio pairs", () => {
    expect(routesFor("yt mp3")).toContain("/youtube-to-mp3");
  });
});
