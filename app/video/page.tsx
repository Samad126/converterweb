import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/seo/JsonLd";
import { VIDEO_CATALOG } from "@/lib/media/mediaCatalog";
import { VIDEO_FORMATS } from "@/lib/media/mediaFormats";
import { breadcrumbList } from "@/lib/content/schema";

/**
 * The crawl hub for the 182 `/video/*` pages — the media equivalent of
 * `/conversions`. Grouped by source format so the list stays scannable.
 */
export const metadata: Metadata = {
  title: "Video conversion",
  description:
    "Convert between MP4, WEBM, MKV, AVI, MOV and other video formats, free online.",
  alternates: { canonical: "/video" },
};

export default function VideoIndexPage(): React.ReactElement {
  const crumbs = [
    ["Home", "/"],
    ["Video conversion", "/video"],
  ] as const;

  return (
    <main id="content" className="shell py-10 sm:py-14">
      <JsonLd document={breadcrumbList(crumbs)} />

      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="breadcrumbs">
          <li>
            <Link href="/">Home</Link>
            <span className="breadcrumb-sep">/</span>
          </li>
          <li>
            <span aria-current="page">Video conversion</span>
          </li>
        </ol>
      </nav>

      <header>
        <h1 className="page-title">Video conversion</h1>
        <p className="page-lede">
          {VIDEO_CATALOG.length} conversions across {VIDEO_FORMATS.length} video formats. Pick a
          source below to see every format it converts to.
        </p>
      </header>

      {VIDEO_FORMATS.map((source) => {
        const targets = VIDEO_CATALOG.filter((entry) => entry.source.id === source.id);
        return (
          <section key={source.id} className="mt-10">
            <h2 className="section-title">From {source.label}</h2>
            <ul className="link-chips mt-3">
              {targets.map((entry) => (
                <li key={entry.slug}>
                  <Link className="link-chip" href={entry.route}>
                    {entry.heading}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
