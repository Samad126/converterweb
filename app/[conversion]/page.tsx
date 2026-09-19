import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ConverterShell } from "@/components/ConverterShell";
import { Faq } from "@/components/Faq";
import { FormatPair } from "@/components/FormatBadge";
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
 * **The prose is the page; the converter is the product.** Everything above the
 * fold — the heading, the lede, what to expect, the questions — is static JSX in
 * the server-rendered HTML, so it is all legible to a crawler that runs no
 * JavaScript and to a visitor on a slow connection whose bundle has not arrived.
 * `ConverterShell` below it is the one client component, and it is the only part
 * that needs the network.
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
    <main id="content" className="mx-auto w-full max-w-[760px] px-5 py-10 sm:py-14">
      <JsonLd document={breadcrumbList(crumbs)} />
      <JsonLd document={conversionApplication(entry)} />
      <JsonLd document={howTo(entry)} />
      <JsonLd document={faqPage(entry.faqs)} />

      <Breadcrumbs crumbs={crumbs} />

      <header>
        <FormatPair source={entry.source.badge} target={entry.targetBadge} size="sm" />
        <h1 className="page-title">{entry.heading}</h1>
        <p className="page-lede">{entry.lede}</p>
      </header>

      <hr className="hairline my-8" />

      <ConverterShell
        lockedTargetId={entry.target}
        acceptedExtensions={entry.source.extensions}
      />

      <hr className="hairline my-10" />

      {/* ------------------------------------------------------ the content */}

      <section className="flex flex-col gap-4">
        <h2 className="section-title">What to expect</h2>
        <p className="body-text">{entry.angle}</p>
        <ul className="fact-list">
          {entry.expect.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      </section>

      <section className="mt-10 flex flex-col gap-4">
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
            <h3 className="step-title">
              Convert to {entry.targetLabel}
            </h3>
            <p className="step-body">
              This page does one thing, so there is no format to choose. Press
              the convert button to upload the file and convert it.
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

      {/* ------------------------------------------------ internal linking */}

      {alternatives.length > 0 ? (
        <nav className="mt-10 flex flex-col gap-3" aria-label={`Other formats from ${entry.sourceLabel}`}>
          <h2 className="section-title">
            Other formats from {entry.sourceLabel}
          </h2>
          <LinkChips entries={alternatives} />
        </nav>
      ) : null}

      {fromOthers.length > 0 ? (
        <nav className="mt-10 flex flex-col gap-3" aria-label={`Other ways to make ${entry.targetLabel}`}>
          <h2 className="section-title">
            Convert to {entry.targetLabel} from something else
          </h2>
          <LinkChips entries={fromOthers} />
        </nav>
      ) : null}

      <section className="mt-10 flex flex-col gap-4">
        <h2 className="section-title">Questions</h2>
        <Faq faqs={entry.faqs} />
      </section>
    </main>
  );
}

/**
 * The breadcrumb trail.
 *
 * `aria-label` on the `<nav>` and a plain `<ol>`: the ordered list is what makes
 * a screen reader announce "3 of 3", which is the whole point of a breadcrumb.
 * The same three crumbs go into the page's `BreadcrumbList` structured data, so
 * the trail a crawler reads is the trail a person sees.
 */
function Breadcrumbs({
  crumbs,
}: {
  crumbs: readonly (readonly [string, string])[];
}): React.ReactElement {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="breadcrumbs">
        {crumbs.map(([name, path], index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={path}>
              {last ? (
                // The current page is not a link to itself — following it would
                // reload the page a visitor is already reading.
                <span aria-current="page">{name}</span>
              ) : (
                <Link href={path}>{name}</Link>
              )}
              {!last ? <span className="breadcrumb-sep">/</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
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
