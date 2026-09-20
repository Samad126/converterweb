import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ConverterShell } from "@/components/ConverterShell";
import { Faq } from "@/components/Faq";
import { JsonLd } from "@/components/JsonLd";
import {
  type ConversionEntry,
  SLUGS,
  findEntry,
  otherSourcesFor,
  otherTargetsFor,
} from "@/lib/catalog";
import {
  breadcrumbList,
  conversionApplication,
  faqPage,
  howTo,
} from "@/lib/schema";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { formatBytes } from "@/lib/format";

/**
 * One page per conversion: `/word_to_pdf`, `/png_to_pdf`, and the other
 * thirty-four.
 *
 * The route is a root-level dynamic segment, which needs one word of
 * explanation. Static routes win over dynamic ones in the App Router, so
 * `/conversions` and `/sitemap.xml` resolve to their own files and never reach
 * here; `dynamicParams = false` then makes every slug not in `SLUGS` a real 404
 * at build time rather than a page rendered into a `notFound()`. The net effect
 * is a fixed, enumerable set of thirty-six URLs and no way to reach a
 * thirty-seventh.
 *
 * **The prose is the page; the converter is the product.** Everything outside
 * the tool — the heading, the lede, what to expect, the questions — is static
 * JSX in the server-rendered HTML, so it is all legible to a crawler that runs
 * no JavaScript and to a visitor on a slow connection whose bundle has not
 * arrived. `ConverterShell` is the one client component, and it is the only
 * part that needs the network.
 *
 * The tool sits directly under the heading, full width, ahead of the prose —
 * it is why someone is here, so it should not cost them a scroll past an
 * introduction to reach it. See `.conversion-layout`.
 */
export const dynamicParams = false;

export function generateStaticParams(): Array<{ conversion: string }> {
  return SLUGS.map((slug) => ({ conversion: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ conversion: string }>;
}): Promise<Metadata> {
  const { conversion } = await params;
  const entry = findEntry(conversion);
  if (entry === null) return {};

  return {
    title: entry.title,
    description: entry.description,
    alternates: { canonical: `/${entry.slug}` },
    openGraph: {
      type: "website",
      title: entry.title,
      description: entry.description,
      url: `/${entry.slug}`,
    },
  };
}

export default async function ConversionPage({
  params,
}: {
  params: Promise<{ conversion: string }>;
}): Promise<React.ReactElement> {
  const { conversion } = await params;
  const entry = findEntry(conversion);
  if (entry === null) notFound();

  const crumbs = [
    ["Home", "/"],
    ["All conversions", "/conversions"],
    [entry.heading, `/${entry.slug}`],
  ] as const;

  const alternatives = otherTargetsFor(entry);
  const fromOthers = otherSourcesFor(entry);

  return (
    <main id="content" className="shell py-10 sm:py-14">
      <JsonLd document={breadcrumbList(crumbs)} />
      <JsonLd document={conversionApplication(entry)} />
      <JsonLd document={howTo(entry)} />
      <JsonLd document={faqPage(entry.faqs)} />

      {/* One column, in reading order: heading, tool, prose — see
          `.conversion-layout`. */}
      <div className="conversion-layout">
        <div>
          <Breadcrumbs crumbs={crumbs} />

          <header className="mt-5">
            <h1 className="page-title">{entry.heading}</h1>
            <p className="page-lede">{entry.lede}</p>
          </header>
        </div>

        {/* The tool, full width, directly under the heading. The `aria-label`
            gives the complementary landmark a name rather than leaving an
            anonymous region on the page. */}
        <aside aria-label={`Convert ${entry.sourceLabel} to ${entry.targetLabel}`}>
          <div className="conversion-aside-inner">
            <ConverterShell
              lockedTargetId={entry.target}
              acceptedExtensions={entry.source.extensions}
            />
          </div>
        </aside>

        {/* The prose. `gap` on this column replaces the per-section top margins
            it used to carry, so the rhythm between blocks is stated once. */}
        <div className="conversion-body">
          <section className="flex flex-col gap-4">
            <h2 className="section-title">What to expect</h2>
            <p className="body-text">{entry.angle}</p>
            <ul className="fact-list">
              {entry.expect.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="section-title">
              How to convert {entry.sourceLabel} to {entry.targetLabel}
            </h2>
            <ol className="steps steps-compact">
              <li className="step">
                <span className="step-index">1</span>
                <h3 className="step-title">Choose your file</h3>
                <p className="step-body">
                  Drop a {entry.sourceLabel} file onto the page or choose one with
                  the dialog. Files up to {formatBytes(MAX_UPLOAD_BYTES)}.
                </p>
              </li>
              <li className="step">
                <span className="step-index">2</span>
                <h3 className="step-title">Convert to {entry.targetLabel}</h3>
                <p className="step-body">
                  This page does one thing, so there is no format to choose.
                  Press the convert button to upload the file and convert it.
                </p>
              </li>
              <li className="step">
                <span className="step-index">3</span>
                <h3 className="step-title">Download the result</h3>
                <p className="step-body">
                  The {entry.targetLabel} comes straight back and downloads under
                  your file&rsquo;s own name, with the new extension.
                </p>
              </li>
            </ol>
          </section>

          {/* ---------------------------------------------- internal linking */}

          {alternatives.length > 0 ? (
            <nav
              className="flex flex-col gap-3"
              aria-label={`Other formats from ${entry.sourceLabel}`}
            >
              <h2 className="section-title">
                Other formats from {entry.sourceLabel}
              </h2>
              <LinkChips entries={alternatives} />
            </nav>
          ) : null}

          {fromOthers.length > 0 ? (
            <nav
              className="flex flex-col gap-3"
              aria-label={`Other ways to make ${entry.targetLabel}`}
            >
              <h2 className="section-title">
                Convert to {entry.targetLabel} from something else
              </h2>
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

/** A row of links to related conversions. */
function LinkChips({
  entries,
}: {
  entries: readonly ConversionEntry[];
}): React.ReactElement {
  return (
    <ul className="link-chips">
      {entries.map((entry) => (
        <li key={entry.slug}>
          <Link className="link-chip" href={`/${entry.slug}`}>
            {entry.heading}
          </Link>
        </li>
      ))}
    </ul>
  );
}
