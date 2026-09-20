import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ExtractPagesTool } from "@/components/pdf/ExtractPagesTool";

export const metadata: Metadata = {
  title: "Extract pages from a PDF — Free Online PDF Tool",
  description: "Pull specific pages into a new PDF, free online. No sign-up, no file left on the server.",
  alternates: { canonical: "/pdf/extract-pages" },
};

export default function ExtractPagesPage(): React.ReactElement {
  return (
    <main id="content" className="shell py-10 sm:py-14">
      <Breadcrumbs
        crumbs={[
          ["Home", "/"],
          ["PDF tools", "/pdf"],
          ["Extract pages from a PDF", "/pdf/extract-pages"],
        ]}
      />

      <h1 className="page-title">Extract pages from a PDF</h1>
      <p className="page-lede">
        Pull the pages you name into a new PDF, in the exact order you name them — so this can
        reorder as well as select.
      </p>
      <div className="conversion-aside-inner mt-8">
        <ExtractPagesTool />
      </div>
    </main>
  );
}
