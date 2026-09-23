import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/seo/JsonLd";
import { AUDIO_CATALOG } from "@/lib/media/mediaCatalog";
import { AUDIO_FORMATS } from "@/lib/media/mediaFormats";
import { breadcrumbList, pageList } from "@/lib/content/schema";

/**
 * The crawl hub for the 210 `/audio/*` pages — the media equivalent of
 * `/conversions`. Grouped by source format so the list stays scannable.
 */
export const metadata: Metadata = {
  title: "Audio conversion",
  description:
    "Convert between MP3, WAV, FLAC, OGG, AAC, M4A, WMA and other audio formats, free online.",
  alternates: { canonical: "/audio" },
};

export default function AudioIndexPage(): React.ReactElement {
  const crumbs = [
    ["Home", "/"],
    ["Audio conversion", "/audio"],
  ] as const;

  return (
    <main id="content" className="shell py-10 sm:py-14">
      <JsonLd document={breadcrumbList(crumbs)} />
      <JsonLd
        document={pageList(
          "Audio conversions",
          AUDIO_CATALOG.map((entry) => [entry.heading, entry.route] as const),
        )}
      />

      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="breadcrumbs">
          <li>
            <Link href="/">Home</Link>
            <span className="breadcrumb-sep">/</span>
          </li>
          <li>
            <span aria-current="page">Audio conversion</span>
          </li>
        </ol>
      </nav>

      <header>
        <h1 className="page-title">Audio conversion</h1>
        <p className="page-lede">
          {AUDIO_CATALOG.length} conversions across {AUDIO_FORMATS.length} audio formats. Pick a
          source below to see every format it converts to.
        </p>
      </header>

      {AUDIO_FORMATS.map((source) => {
        const targets = AUDIO_CATALOG.filter((entry) => entry.source.id === source.id);
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
