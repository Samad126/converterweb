import type { Metadata } from "next";

import { CategorySection } from "@/components/CategorySection";
import { CATEGORIES } from "@/lib/categories";

export const metadata: Metadata = {
  title: "PDF Tools — Free Online PDF Editor",
  description:
    "OCR, compress, merge, split and more — free PDF tools that work on any PDF, no sign-up.",
  alternates: { canonical: "/pdf" },
};

/**
 * The four non-conversion categories from `lib/categories.ts` — everything on
 * this page works directly on a PDF (or, for the two extraction tools, a PSD
 * or Word document), no format conversion involved.
 */
const PDF_CATEGORIES = CATEGORIES.filter((category) => category.id !== "convert");

export default function PdfToolsIndexPage(): React.ReactElement {
  return (
    <main id="content">
      <div className="shell section">
        <h1 className="page-title">PDF tools</h1>
        <p className="page-lede">
          A set of tools grouped by what you&rsquo;re trying to do. Every PDF tool here works on
          any valid PDF — there is nothing to check first, unlike the conversion pages.
        </p>
      </div>

      {PDF_CATEGORIES.map((category) => (
        <CategorySection key={category.id} category={category} hideSeeAll />
      ))}
    </main>
  );
}
