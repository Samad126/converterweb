import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { CategorySection } from "@/components/ui/CategorySection";
import { CATEGORIES } from "@/lib/content/categories";

export const metadata: Metadata = {
  title: "Extra tools",
  description:
    "Extraction tools that don't fit the document-conversion matrix or the PDF toolkit: pull every layer out of a PSD, or every table out of a Word document.",
  alternates: { canonical: "/tools" },
};

/**
 * `/tools` — the hub for the two standalone extraction tools that are
 * neither a `{source}_to_{target}` conversion page nor a `/pdf/*` tool.
 *
 * Both take a source format the rest of the site never touches as a whole-file
 * conversion — a Photoshop file, or a Word document read for its tables
 * rather than converted whole — and reach exactly one target each. See the
 * note at the top of `lib/content/catalog.ts`
 * for why that makes them a poor fit for the 36-page conversion matrix. This
 * page is `lib/content/categories.ts`'s `extract` category, given a permanent home
 * instead of pointing at `/pdf`, which neither tool's input format has
 * anything to do with.
 */
export default function ExtraToolsPage(): React.ReactElement {
  const category = CATEGORIES.find((c) => c.id === "extract");
  if (!category) throw new Error("tools: lib/content/categories.ts has no 'extract' category");

  return (
    <main id="content">
      <div className="shell section">
        <Breadcrumbs crumbs={[["Home", "/"], ["Extra tools", "/tools"]]} />

        <h1 className="page-title">Extra tools</h1>
        <p className="page-lede">
          Two extraction tools that don&rsquo;t fit anywhere else: pulling
          content out of a file rather than converting the whole thing, from
          a format the conversion matrix and the PDF toolkit don&rsquo;t
          otherwise touch.
        </p>
      </div>

      <CategorySection category={category} index={1} hideSeeAll />
    </main>
  );
}
