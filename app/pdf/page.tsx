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
 * The non-conversion, PDF-only categories from `lib/categories.ts` —
 * everything on this page works directly on a PDF, no format conversion
 * involved. `extract` is excluded too: its two tools take a PSD or a Word
 * document, not a PDF, so they get their own hub at `/tools` instead.
 */
const PDF_CATEGORIES = CATEGORIES.filter(
  (category) => category.id !== "convert" && category.id !== "extract",
);

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

      {PDF_CATEGORIES.map((category, i) => (
        <CategorySection key={category.id} category={category} index={i + 1} hideSeeAll />
      ))}
    </main>
  );
}
