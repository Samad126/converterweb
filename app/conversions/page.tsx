import type { Metadata } from "next";
import Link from "next/link";

import { ConversionFinder } from "@/components/ConversionFinder";
import { JsonLd } from "@/components/JsonLd";
import { ToolCard } from "@/components/ToolCard";
import { CATALOG, entriesByFamily } from "@/lib/catalog";
import { breadcrumbList, itemList } from "@/lib/schema";

/**
 * Every conversion, grouped by document family.
 *
 * This is the crawl hub. The homepage grid and the footer already link all
 * sixty-seven pages, so nothing here is reachable *only* from this page — it
 * exists because a page that lists everything with a sentence of context is a
 * better landing point than a grid of tiles when what you want is to compare
 * options, and because a hub with descriptive headings around its links is a
 * stronger signal about what the linked pages are actually for.
 */
export const metadata: Metadata = {
  title: "All conversions",
  description:
    "Every conversion this service can perform, grouped by document type: Word, Excel, PowerPoint, ODT, ODS, ODP, CSV, TXT, HTML, RTF, PNG and JPG files into PDF and each other.",
  alternates: { canonical: "/conversions" },
};

export default function ConversionsPage(): React.ReactElement {
  const families = entriesByFamily();

  const crumbs = [
    ["Home", "/"],
    ["All conversions", "/conversions"],
  ] as const;

  return (
    <main id="content" className="shell py-10 sm:py-14">
      <JsonLd document={itemList(CATALOG)} />
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
          {CATALOG.length} conversions across four document families. Every one
          of them runs the same way: choose a file, and the output format is
          already selected for you. Nothing here needs an account, and nothing
          you upload is kept.
        </p>
      </header>

      <div className="mt-10">
        <ConversionFinder />
      </div>

      {families.map((group) => (
        <section key={group.key} className="mt-12">
          <h2 className="section-title">{group.label}</h2>
          <div className="tool-grid mt-5">
            {group.entries.map((entry) => (
              <ToolCard key={entry.slug} entry={entry} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
