import type { Metadata } from "next";
import Link from "next/link";

import { Faq } from "@/components/Faq";
import { JsonLd } from "@/components/JsonLd";
import { ToolGrid } from "@/components/ToolGrid";
import { CATALOG, HOME_FAQS, entriesByFamily } from "@/lib/catalog";
import { faqPage, itemList } from "@/lib/schema";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

/**
 * The homepage: every tool in one place.
 *
 * A server component, and deliberately a thin one. All of the content below is
 * static JSX built from `lib/catalog.ts`, so the whole page — heading, prose,
 * and all thirty-six links — is in the HTML that leaves the server. There is no
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

export default function HomePage(): React.ReactElement {
  const families = entriesByFamily();

  return (
    <main id="content">
      <JsonLd document={itemList(CATALOG)} />
      <JsonLd document={faqPage(HOME_FAQS)} />

      {/* ------------------------------------------------------------ hero */}
      <section className="hero">
        <div className="shell">
          <h1 className="hero-title">
            Every file conversion you need, in one place
          </h1>
          <p className="hero-lede">
            Convert documents, spreadsheets, presentations and images into PDF —
            and between each other — without installing anything, making an
            account, or leaving a copy behind. {SITE_NAME} runs the conversion on
            a server, hands the result straight back, and deletes the file before
            the response is even sent.
          </p>
          <p className="hero-actions">
            <a className="btn hero-cta" href="#tools">
              Browse all {CATALOG.length} conversions
            </a>
          </p>
        </div>
      </section>

      {/* ----------------------------------------------------------- tools */}
      <section className="shell section" id="tools">
        <h2 className="section-title">All conversions</h2>
        <p className="section-lede">
          Pick the one you need. Every tool opens with the output format already
          selected, so there is a single choice left to make: the file.
        </p>

        <ToolGrid entries={CATALOG} />
      </section>

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

      {/* --------------------------------------------- family deep links */}
      <section className="shell section section-rule">
        <h2 className="section-title">Browse by file type</h2>
        <div className="link-columns">
          {families.map((group) => (
            <nav key={group.family} aria-label={`${group.label} conversions`}>
              <h3 className="link-column-heading">{group.label}</h3>
              <ul className="link-list">
                {group.entries.map((entry) => (
                  <li key={entry.slug}>
                    <Link href={`/${entry.slug}`} prefetch={false}>
                      {entry.heading}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
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
