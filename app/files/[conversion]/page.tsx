import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ConverterShell } from "@/components/converter/ConverterShell";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Faq } from "@/components/ui/Faq";
import { JsonLd } from "@/components/seo/JsonLd";
import type { TargetId } from "@/lib/api/contract";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import {
  FILE_SLUGS,
  type FileConversionEntry,
  findFileEntry,
  otherFileSourcesFor,
  otherFileTargetsFor,
} from "@/lib/files/fileCatalog";
import { faqPage } from "@/lib/content/schema";
import { formatBytes } from "@/lib/format";

/**
 * One page per conversion the document, audio and video catalogs do not cover
 * — see `lib/files/fileCatalog.ts`. `dynamicParams = false` makes every slug not
 * in the catalog a real 404 at build time.
 */
export const dynamicParams = false;

export function generateStaticParams(): Array<{ conversion: string }> {
  return FILE_SLUGS.map((slug) => ({ conversion: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ conversion: string }>;
}): Promise<Metadata> {
  const { conversion } = await params;
  const entry = findFileEntry(conversion);
  if (entry === null) return {};

  return {
    title: entry.title,
    description: entry.description,
    alternates: { canonical: entry.route },
    openGraph: { type: "website", title: entry.title, description: entry.description, url: entry.route },
  };
}

export default async function FileConversionPage({
  params,
}: {
  params: Promise<{ conversion: string }>;
}): Promise<React.ReactElement> {
  const { conversion } = await params;
  const entry = findFileEntry(conversion);
  if (entry === null) notFound();

  const crumbs = [
    ["Home", "/"],
    ["All conversions", "/conversions"],
    [entry.heading, entry.route],
  ] as const;

  const alternatives = otherFileTargetsFor(entry);
  const fromOthers = otherFileSourcesFor(entry);

  return (
    <main id="content" className="shell py-10 sm:py-14">
      <JsonLd document={faqPage(entry.faqs)} />

      <div className="conversion-layout">
        <div>
          <Breadcrumbs crumbs={crumbs} />
          <header className="mt-5">
            <h1 className="page-title">{entry.heading}</h1>
            <p className="page-lede">{entry.lede}</p>
          </header>
        </div>

        <section aria-label={`Convert ${entry.sourceLabel} to ${entry.targetLabel}`}>
          <div className="conversion-aside-inner">
            {/* The id space is the backend's; the generated types lag it, and the
                live GET /formats matrix is what decides whether the button works. */}
            <ConverterShell
              lockedTargetId={entry.targetId as TargetId}
              acceptedExtensions={entry.extensions}
            />
          </div>
        </section>

        <div className="conversion-body">
          <section className="flex flex-col gap-4">
            <h2 className="section-title">What to expect</h2>
            <ul className="fact-list">
              <li>
                Files accepted: {entry.extensions.join(", ")} — up to {formatBytes(MAX_UPLOAD_BYTES)}.
              </li>
              <li>The output is a {entry.targetLabel} file, named after your file with the new extension.</li>
            </ul>
          </section>

          {alternatives.length > 0 ? (
            <nav className="flex flex-col gap-3" aria-label={`Other formats from ${entry.sourceLabel}`}>
              <h2 className="section-title">Other formats from {entry.sourceLabel}</h2>
              <LinkChips entries={alternatives} />
            </nav>
          ) : null}

          {fromOthers.length > 0 ? (
            <nav className="flex flex-col gap-3" aria-label={`Other ways to make ${entry.targetLabel}`}>
              <h2 className="section-title">Convert to {entry.targetLabel} from something else</h2>
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

function LinkChips({ entries }: { entries: readonly FileConversionEntry[] }): React.ReactElement {
  return (
    <ul className="link-chips">
      {entries.map((entry) => (
        <li key={entry.slug}>
          <Link className="link-chip" href={entry.route} prefetch={false}>
            {entry.heading}
          </Link>
        </li>
      ))}
    </ul>
  );
}
