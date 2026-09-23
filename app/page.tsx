import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { CategorySection } from "@/components/ui/CategorySection";
import { Faq } from "@/components/ui/Faq";
import { JsonLd } from "@/components/seo/JsonLd";
import { ToolSearch } from "@/components/search/ToolSearch";
import { CATALOG, HOME_FAQS } from "@/lib/content/catalog";
import { CATEGORIES } from "@/lib/content/categories";
import { AUDIO_CATALOG, VIDEO_CATALOG } from "@/lib/media/mediaCatalog";
import { PDF_TOOLS } from "@/lib/pdf/pdfTools";
import { faqPage, itemList } from "@/lib/content/schema";
import { SITE_NAME, absoluteUrl } from "@/lib/content/site";

/**
 * The homepage: every tool in one place.
 *
 * A server component, and deliberately a thin one. All of the content below is
 * static JSX built from `lib/content/catalog.ts`, so the whole page — heading, prose,
 * and all sixty-seven links — is in the HTML that leaves the server. There is no
 * client component anywhere on this page, which means there is nothing to
 * hydrate and nothing that can fail to render for a crawler.
 *
 * The one thing it does not do is run a conversion. A visitor who wants the
 * universal tool — any file, any format — is sent to `/convert`, and a visitor
 * who has a specific conversion in mind clicks the card for it, which lands them
 * on a page with the format already chosen.
 */
export const metadata: Metadata = {
  // `title.default` in the layout covers the exact title; this page only needs
  // to own its canonical, so that the root is never credited to a duplicate.
  alternates: { canonical: "/" },
  openGraph: { url: absoluteUrl("/") },
};

/**
 * How many `/pdf/*` tools actually have a page.
 *
 * `lib/pdf/pdfTools.ts` names tools that are planned as well as ones that ship, and
 * gates a link on `route` — so counting the array would claim tools that do not
 * exist yet. The hero repeats this number, so it has to be the honest one.
 */
const shippedPdfTools = PDF_TOOLS.filter((tool) => tool.route !== null).length;

export default function HomePage(): React.ReactElement {
  return (
    <main id="content">
      <JsonLd document={itemList(CATALOG)} />
      <JsonLd document={faqPage(HOME_FAQS)} />

      {/* ------------------------------------------------------------ hero */}
      <section className="hero">
        <div className="shell">
          {/* Three facts, as a masthead. This is the first thing on the page
              and the only sentence a visitor is guaranteed to read, so it says
              the three things that separate this from a tool that asks for an
              email address — and it says them in the smallest type on the page,
              which is what makes the headline under it land. */}
          <p className="eyebrow">No account · No install · Nothing kept</p>

          <h1 className="hero-title">
            Every file conversion you need, in one place
          </h1>
          <p className="hero-lede">
            Convert documents, spreadsheets, presentations and images into PDF —
            and between each other — and transcode audio and video between
            formats, without installing anything, making an account, or leaving
            a copy behind. {SITE_NAME} runs the conversion on a server, hands the
            result straight back, and deletes the file before the response is
            even sent.
          </p>
          <div className="hero-search mt-6">
            <Suspense fallback={<div className="tool-search-input" aria-hidden="true" />}>
              <ToolSearch placeholder="Search a format, extension or tool — e.g. “word to pdf”" />
            </Suspense>
          </div>
          <p className="hero-actions">
            <Link className="btn hero-cta" href="/conversions">
              Browse all conversions
            </Link>
          </p>

          {/* Counted, never written down: all four figures come from the same
              registries the pages themselves are built from, so a conversion
              added tomorrow changes this number without anyone remembering to.

              `column-reverse` puts the figure above its label while the DOM
              keeps the `dt`-then-`dd` order a definition list requires — so a
              screen reader hears "Document conversions, 36" rather than a bare
              number. */}
          <dl className="hero-stats">
            <div className="stat">
              <dt className="stat-label">Document conversions</dt>
              <dd className="stat-value">{CATALOG.length}</dd>
            </div>
            <div className="stat">
              <dt className="stat-label">Audio &amp; video</dt>
              <dd className="stat-value">{AUDIO_CATALOG.length + VIDEO_CATALOG.length}</dd>
            </div>
            <div className="stat">
              <dt className="stat-label">PDF tools</dt>
              <dd className="stat-value">{shippedPdfTools}</dd>
            </div>
            <div className="stat">
              <dt className="stat-label">Files stored</dt>
              <dd className="stat-value">0</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ----------------------------------------------------------- tools */}
      <div id="tools">
        {CATEGORIES.map((category, i) => (
          <CategorySection key={category.id} category={category} index={i + 1} />
        ))}
      </div>

      {/* ---------------------------------------------------- how it works */}
      <section className="shell section section-rule">
        <h2 className="section-title">How it works</h2>
        <ol className="steps">
          <li className="step">
            <span className="step-index">1</span>
            <h3 className="step-title">Choose your file</h3>
            <p className="step-body">
              Drag a file onto the page or pick one with the dialog. The
              converter reads the filename extension, so it knows what it is
              dealing with before anything is uploaded.
            </p>
          </li>
          <li className="step">
            <span className="step-index">2</span>
            <h3 className="step-title">Pick an output format</h3>
            <p className="step-body">
              Every format the service can make from your file is offered, and
              anything it cannot is shown disabled with the reason. There is no
              guessing at what is supported.
            </p>
          </li>
          <li className="step">
            <span className="step-index">3</span>
            <h3 className="step-title">Download the result</h3>
            <p className="step-body">
              The converted file comes straight back and downloads under the name
              you uploaded, with the new extension. Nothing is stored in your
              browser, and the copy on the server is already gone.
            </p>
          </li>
        </ol>
      </section>

      {/* ------------------------------------------------------------- why */}
      <section className="shell section section-rule">
        <h2 className="section-title">Why this one</h2>
        <div className="panels">
          <div className="panel">
            <h3 className="panel-title">Nothing to install</h3>
            <p className="panel-body">
              There is no desktop application, no browser extension and no
              account. The conversion happens on a server, so nothing needs
              updating and nothing keeps running after you close the tab.
            </p>
          </div>
          <div className="panel">
            <h3 className="panel-title">Your file is not kept</h3>
            <p className="panel-body">
              Each conversion gets its own temporary workspace, deleted before
              the response is sent — on success, on failure, on timeout, and if
              you close the page mid-conversion. Contents and filenames are never
              logged.
            </p>
          </div>
          <div className="panel">
            <h3 className="panel-title">It tells you the truth</h3>
            <p className="panel-body">
              Every format the server supports is listed, including the ones your
              file cannot become and why. There is no upsell, no queue-jumping
              tier, and no format held back to sell later.
            </p>
          </div>
          <div className="panel">
            <h3 className="panel-title">The same engine as the desktop suite</h3>
            <p className="panel-body">
              Conversions run through LibreOffice, the open-source office suite,
              rather than a proprietary format library. It is the same software
              millions of people use to open these files locally.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- faq */}
      <section className="shell section section-rule">
        <h2 className="section-title">Questions</h2>
        <Faq faqs={HOME_FAQS} />
      </section>
    </main>
  );
}
