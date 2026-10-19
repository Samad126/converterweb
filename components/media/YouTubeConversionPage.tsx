/**
 * One `/youtube-to-*` page: the heading and the copy, the tool beside them, and
 * the questions under. Server-rendered, so the copy a crawler reads is the copy
 * a person sees; only `YouTubeConvertTool` is interactive.
 *
 * The page structure is the same as `app/video/[conversion]/page.tsx`, for the
 * same reason the copy is generated: the two YouTube pages differ only in their
 * target, and the media hubs are already where the other conversions live.
 */
import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Faq } from "@/components/ui/Faq";
import { JsonLd } from "@/components/seo/JsonLd";
import { YouTubeConvertTool } from "@/components/media/YouTubeConvertTool";
import { breadcrumbList, faqPage } from "@/lib/content/schema";
import { YOUTUBE_CONVERSIONS, type YouTubeConversionEntry } from "@/lib/media/youtubeCatalog";

/** The `<title>`, description and canonical for one YouTube page. */
export function youtubePageMetadata(entry: YouTubeConversionEntry): Metadata {
  return {
    title: entry.title,
    description: entry.description,
    alternates: { canonical: entry.route },
    openGraph: { type: "website", title: entry.title, description: entry.description, url: entry.route },
  };
}

export function YouTubeConversionPage({ entry }: { entry: YouTubeConversionEntry }): React.ReactElement {
  const crumbs = [
    ["Home", "/"],
    [entry.heading, entry.route],
  ] as const;
  const others = YOUTUBE_CONVERSIONS.filter((other) => other.targetId !== entry.targetId);

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

        <aside aria-label={entry.heading}>
          <div className="conversion-aside-inner">
            <YouTubeConvertTool entry={entry} />
          </div>
        </aside>

        <div className="conversion-body">
          <section className="flex flex-col gap-4">
            <h2 className="section-title">What to expect</h2>
            <ul className="fact-list">
              <li>Links accepted: youtube.com, m.youtube.com, music.youtube.com and youtu.be.</li>
              <li>Output: {entry.output}.</li>
              <li>
                Conversion runs on the server in the background. Keep this tab open until the file is ready: the page
                checks in every couple of seconds and fetches the file once it is done.
              </li>
              <li>Videos over 200 MB are refused by default.</li>
              <li>Only download videos you have the right to save.</li>
            </ul>
          </section>

          <nav className="flex flex-col gap-3" aria-label="Related pages">
            <h2 className="section-title">Other ways to get a file</h2>
            <ul className="link-chips">
              {others.map((other) => (
                <li key={other.slug}>
                  <Link className="link-chip" href={other.route}>
                    {other.heading}
                  </Link>
                </li>
              ))}
              <li>
                <Link className="link-chip" href="/audio">
                  Audio conversion
                </Link>
              </li>
              <li>
                <Link className="link-chip" href="/video">
                  Video conversion
                </Link>
              </li>
            </ul>
          </nav>

          <section className="flex flex-col gap-4">
            <h2 className="section-title">Questions</h2>
            <Faq faqs={entry.faqs} />
          </section>
        </div>
      </div>
    </main>
  );
}
