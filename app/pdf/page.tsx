import type { Metadata } from "next";
import Link from "next/link";

import { PDF_TOOLS } from "@/lib/pdfTools";

export const metadata: Metadata = {
  title: "PDF Tools — Free Online PDF Editor",
  description:
    "OCR, compress, merge, split and more — free PDF tools that work on any PDF, no sign-up.",
  alternates: { canonical: "/pdf" },
};

export default function PdfToolsIndexPage(): React.ReactElement {
  const live = PDF_TOOLS.filter((tool) => tool.route !== null);
  const upcoming = PDF_TOOLS.filter((tool) => tool.route === null);

  return (
    <main id="content" className="mx-auto w-full max-w-[1100px] px-5 py-10 sm:py-14">
      <h1 className="page-title">PDF tools</h1>
      <p className="page-lede">
        A set of tools that work directly on a PDF — no conversion involved. Every tool here
        works on any valid PDF; there is nothing to check first, unlike the conversion pages.
      </p>

      <section className="tool-grid mt-8">
        {live.map((tool) => (
          <Link key={tool.id} href={tool.route as string} className="tool-card">
            <span className="tool-card-title">{tool.label}</span>
            <span className="tool-card-blurb">{tool.blurb}</span>
          </Link>
        ))}
      </section>

      {upcoming.length > 0 ? (
        <section className="mt-10 flex flex-col gap-4">
          <h2 className="section-title">Coming soon</h2>
          <ul className="fact-list">
            {upcoming.map((tool) => (
              <li key={tool.id}>
                {tool.label} — {tool.blurb}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-10 flex flex-col gap-4">
        <h2 className="section-title">Extraction tools</h2>
        <p className="body-text">
          Two more one-off tools that pull specific content out of a file rather than converting
          the whole thing.
        </p>
        <section className="tool-grid">
          <Link href="/tools/psd-to-layers" className="tool-card">
            <span className="tool-card-title">PSD to layers</span>
            <span className="tool-card-blurb">Every layer of a Photoshop file as its own PNG.</span>
          </Link>
          <Link href="/tools/extract-tables" className="tool-card">
            <span className="tool-card-title">Extract tables</span>
            <span className="tool-card-blurb">Just a Word document&rsquo;s tables, as an Excel workbook.</span>
          </Link>
        </section>
      </section>
    </main>
  );
}
