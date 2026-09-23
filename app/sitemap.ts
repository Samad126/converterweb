import type { MetadataRoute } from "next";

import { SLUGS } from "@/lib/content/catalog";
import { AUDIO_CATALOG, VIDEO_CATALOG } from "@/lib/media/mediaCatalog";
import { absoluteUrl } from "@/lib/content/site";

/**
 * The sitemap.
 *
 * The homepage, the three hubs (`/conversions`, `/audio`, `/video`), and one
 * URL per conversion — 36 document pairs plus 392 audio/video pairs. The
 * conversion pages are `priority: 0.8`/`0.7` rather than the homepage's `1`
 * because they are the pages that earn the traffic and the homepage is the
 * page that routes it — but priority is a hint Google has said it ignores, so
 * the ordering here is documentation for the next reader rather than a lever.
 *
 * `lastModified` is the build time. These pages are generated from a catalog
 * that only changes when the code does, so the build is exactly when the content
 * last changed, and there is no cheaper honest value.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: absoluteUrl("/"),
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/conversions"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...SLUGS.map((slug) => ({
      url: absoluteUrl(`/${slug}`),
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    {
      url: absoluteUrl("/audio"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/video"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...AUDIO_CATALOG.map((entry) => ({
      url: absoluteUrl(entry.route),
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...VIDEO_CATALOG.map((entry) => ({
      url: absoluteUrl(entry.route),
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
