import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Faq } from "@/components/ui/Faq";
import { JsonLd } from "@/components/seo/JsonLd";
import { MediaConvertTool } from "@/components/media/MediaConvertTool";
import {
  AUDIO_SLUGS,
  type MediaConversionEntry,
  findMediaEntry,
  otherSourcesFor,
  otherTargetsFor,
} from "@/lib/media/mediaCatalog";
import { breadcrumbList, faqPage } from "@/lib/content/schema";

/**
 * One page per audio pair: `/audio/mp3_to_wav`, and every other audio pair. See
 * `lib/media/mediaCatalog.ts` for why the copy is templated rather than hand-written
 * the way `app/[conversion]/page.tsx`'s document pages are.
 */
export const dynamicParams = false;

export function generateStaticParams(): Array<{ conversion: string }> {
  return AUDIO_SLUGS.map((slug) => ({ conversion: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ conversion: string }>;
}): Promise<Metadata> {
  const { conversion } = await params;
  const entry = findMediaEntry("audio", conversion);
  if (entry === null) return {};

  return {
    title: entry.title,
    description: entry.description,
    alternates: { canonical: entry.route },
    openGraph: { type: "website", title: entry.title, description: entry.description, url: entry.route },
  };
}

export default async function AudioConversionPage({
  params,
}: {
  params: Promise<{ conversion: string }>;
}): Promise<React.ReactElement> {
  const { conversion } = await params;
  const entry = findMediaEntry("audio", conversion);
  if (entry === null) notFound();

  const crumbs = [
    ["Home", "/"],
    ["Audio conversion", "/audio"],
    [entry.heading, entry.route],
  ] as const;

  const alternatives = otherTargetsFor(entry);
  const fromOthers = otherSourcesFor(entry);

  return (
    <main id="content" className="shell py-10 sm:py-14">
      <JsonLd document={breadcrumbList(crumbs)} />
      <JsonLd document={faqPage(entry.faqs)} />

      <div className="conversion-layout">
        <div>
          <Breadcrumbs crumbs={crumbs} />
          <header className="mt-5">
            <h1 className="page-title">{entry.heading}</h1>
            <p className="page-lede">{entry.lede}</p>
          </header>
        </div>

        <aside aria-label={`Convert ${entry.source.label} to ${entry.target.label}`}>
          <div className="conversion-aside-inner">
            <MediaConvertTool entry={entry} />
          </div>
        </aside>

        <div className="conversion-body">
          <section className="flex flex-col gap-4">
            <h2 className="section-title">What to expect</h2>
            <ul className="fact-list">
              <li>Files accepted: {entry.source.extension} — up to 500 MB.</li>
              <li>
                Transcoded with ffmpeg using its default settings for {entry.target.label} — there is
                no bitrate or quality option to configure.
              </li>
              <li>Conversion runs in the background; the page checks in every couple of seconds until it&rsquo;s done.</li>
            </ul>
          </section>

          {alternatives.length > 0 ? (
            <nav className="flex flex-col gap-3" aria-label={`Other formats from ${entry.source.label}`}>
              <h2 className="section-title">Other formats from {entry.source.label}</h2>
              <LinkChips entries={alternatives} />
            </nav>
          ) : null}

          {fromOthers.length > 0 ? (
            <nav className="flex flex-col gap-3" aria-label={`Other ways to make ${entry.target.label}`}>
              <h2 className="section-title">Convert to {entry.target.label} from something else</h2>
              <LinkChips entries={fromOthers} />
            </nav>
          ) : null}

          <section className="flex flex-col gap-4">
            <h2 className="section-title">Questions</h2>
            <Faq faqs={entry.faqs} />
          </section>
        </div>
      </div>
    </main>
  );
}

function LinkChips({ entries }: { entries: readonly MediaConversionEntry[] }): React.ReactElement {
  return (
    <ul className="link-chips">
      {entries.map((entry) => (
        <li key={entry.slug}>
          <Link className="link-chip" href={entry.route}>
            {entry.heading}
          </Link>
        </li>
      ))}
    </ul>
  );
}
