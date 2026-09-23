import type { Metadata } from "next";
import Link from "next/link";

import { ConversionFinder } from "@/components/converter/ConversionFinder";
import { JsonLd } from "@/components/seo/JsonLd";
import { ConversionGroup } from "@/components/ui/ConversionGroup";
import { PairCard } from "@/components/ui/PairCard";
import { ToolCard } from "@/components/ui/ToolCard";
import { CATALOG, entriesByFamily } from "@/lib/content/catalog";
import { TOTAL_CONVERSIONS } from "@/lib/content/conversionIndex";
import { breadcrumbList, itemList, pageList } from "@/lib/content/schema";
import { FILE_CATALOG, FILE_CATEGORIES } from "@/lib/files/fileCatalog";
import { AUDIO_CATALOG, MEDIA_CATALOG, VIDEO_CATALOG } from "@/lib/media/mediaCatalog";
import { AUDIO_FORMATS, VIDEO_FORMATS } from "@/lib/media/mediaFormats";

/**
 * Every conversion, grouped by type: documents by family, then audio and video.
 *
 * This is the crawl hub. The homepage grid and the footer already link the
 * document pages and `/audio` and `/video` list their own, so nothing here is
 * reachable *only* from this page — it exists because a page that lists
 * everything with a sentence of context is a better landing point than a grid
 * of tiles when what you want is to compare options, and because a hub with
 * descriptive headings around its links is a stronger signal about what the
 * linked pages are actually for.
 */
export const metadata: Metadata = {
  title: "All conversions",
  description:
    "Every conversion this service can perform: Word, Excel, PowerPoint, ODT, ODS, ODP, CSV, TXT, HTML, RTF, PNG and JPG files into PDF and each other, plus archives (ZIP, RAR, 7Z and more), images, data files, subtitles, e-books, fonts, 3D models, audio (MP3, WAV, FLAC and more) and video (MP4, WEBM, MKV and more).",
  alternates: { canonical: "/conversions" },
};

const MEDIA_SECTIONS = [
  { key: "audio", label: "Audio", formats: AUDIO_FORMATS, catalog: AUDIO_CATALOG, hub: "/audio" },
  { key: "video", label: "Video", formats: VIDEO_FORMATS, catalog: VIDEO_CATALOG, hub: "/video" },
] as const;

export default function ConversionsPage(): React.ReactElement {
  const families = entriesByFamily();

  const crumbs = [
    ["Home", "/"],
    ["All conversions", "/conversions"],
  ] as const;

  return (
    <main id="content" className="shell py-10 sm:py-14">
      <JsonLd document={itemList(CATALOG)} />
      <JsonLd
        document={pageList(
          "Audio and video conversions",
          MEDIA_CATALOG.map((entry) => [entry.heading, entry.route] as const),
        )}
      />
      <JsonLd document={breadcrumbList(crumbs)} />

      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="breadcrumbs">
          <li>
            <Link href="/">Home</Link>
            <span className="breadcrumb-sep">/</span>
          </li>
          <li>
            <span aria-current="page">All conversions</span>
          </li>
        </ol>
      </nav>

      <header>
        <h1 className="page-title">All conversions</h1>
        <p className="page-lede">
          {TOTAL_CONVERSIONS} conversions across documents, spreadsheets, presentations, images,
          archives, data files, subtitles, e-books, fonts, 3D models, email, audio and video. Every one of them runs the same way: choose a file, and the output
          format is already selected for you. Nothing here needs an account, and nothing you
          upload is kept.
        </p>
      </header>

      <div className="mt-10">
        <ConversionFinder />
      </div>

      <div className="faq mt-12">
      {families.map((group) => (
        <ConversionGroup key={group.key} label={group.label} count={group.entries.length}>
          <div className="tool-grid">
            {group.entries.map((entry) => (
              <ToolCard key={entry.slug} entry={entry} />
            ))}
          </div>
        </ConversionGroup>
      ))}

      {MEDIA_SECTIONS.map((section) => (
        <ConversionGroup key={section.key} label={section.label} count={section.catalog.length}>
          <p className="body-text">
            {section.catalog.length} conversions across {section.formats.length} {section.key}{" "}
            formats. <Link href={section.hub}>Open the {section.key} hub</Link> for the same list
            on its own page.
          </p>
          {section.formats.map((source) => (
            <div key={source.id} className="mt-6">
              <h3 className="meta">From {source.label}</h3>
              <div className="tool-grid mt-3">
                {section.catalog
                  .filter((entry) => entry.source.id === source.id)
                  .map((entry) => (
                    <PairCard
                      key={entry.slug}
                      href={entry.route}
                      source={entry.source.label}
                      target={entry.target.label}
                      heading={entry.heading}
                      blurb={`A ${entry.target.label} file, converted in the background.`}
                    />
                  ))}
              </div>
            </div>
          ))}
        </ConversionGroup>
      ))}
      {FILE_CATEGORIES.map(({ key, label }) => {
        const entries = FILE_CATALOG.filter((entry) => entry.category === key);
        const sources = [...new Set(entries.map((entry) => entry.sourceLabel))];
        if (sources.length === 0) return null;
        return (
          <ConversionGroup key={key} label={label} count={entries.length}>
            {sources.map((sourceLabel) => (
              <div key={sourceLabel} className="mt-6">
                <h3 className="meta">From {sourceLabel}</h3>
                <div className="tool-grid mt-3">
                  {entries
                    .filter((entry) => entry.sourceLabel === sourceLabel)
                    .map((entry) => (
                      <PairCard
                        key={entry.slug}
                        href={entry.route}
                        source={entry.sourceLabel}
                        target={entry.targetLabel}
                        heading={entry.heading}
                        blurb={`A ${entry.targetLabel} file, ready to download.`}
                      />
                    ))}
                </div>
              </div>
            ))}
          </ConversionGroup>
        );
      })}
      </div>
    </main>
  );
}
