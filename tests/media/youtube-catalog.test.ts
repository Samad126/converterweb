/**
 * `lib/media/youtubeCatalog.ts` - the two `/youtube-to-*` pages. The target ids
 * come from the generated contract, so a target the service does not define
 * fails to compile; these tests check what the catalog builds from them.
 */
import { describe, expect, it } from "vitest";

import { YOUTUBE_CONVERSIONS, youtubeEntryFor } from "@/lib/media/youtubeCatalog";

describe("the YouTube pages", () => {
  it("has one page per target the service produces, at a static route", () => {
    expect(YOUTUBE_CONVERSIONS.map((entry) => entry.route)).toEqual(["/youtube-to-mp3", "/youtube-to-mp4"]);
    expect(YOUTUBE_CONVERSIONS.map((entry) => entry.targetId)).toEqual(["mp3", "mp4"]);
  });

  it("names the output format in its heading, from the media matrix", () => {
    expect(youtubeEntryFor("mp3").heading).toBe("YouTube to MP3");
    expect(youtubeEntryFor("mp4").heading).toBe("YouTube to MP4");
  });

  it("says what each page gives back, and only that", () => {
    expect(youtubeEntryFor("mp3").output).toBe("the audio track of the video, as an MP3 file");
    expect(youtubeEntryFor("mp4").output).toBe("the video itself, as an MP4 file");
  });

  it("answers the rights question on every page, since the copy promises the file is the user's to keep", () => {
    for (const entry of YOUTUBE_CONVERSIONS) {
      expect(entry.faqs.map((faq) => faq.question)).toContain("Am I allowed to download this?");
    }
  });

  it("gives each page its own canonical and a title that names the conversion", () => {
    for (const entry of YOUTUBE_CONVERSIONS) {
      expect(entry.title).toContain(entry.heading);
      expect(entry.slug).toBe(entry.route.slice(1));
    }
  });
});
