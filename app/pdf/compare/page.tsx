import type { Metadata } from "next";

import { CompareTool } from "@/components/pdf/CompareTool";

export const metadata: Metadata = {
  title: "Compare Two PDFs — Free Online PDF Tool",
  description: "See what changed between two PDFs, page by page, free online. No sign-up, no file left on the server.",
  alternates: { canonical: "/pdf/compare" },
};

export default function ComparePage(): React.ReactElement {
  return (
    <main id="content" className="mx-auto w-full max-w-[760px] px-5 py-14">
      <h1 className="page-title">Compare two PDFs</h1>
      <p className="page-lede">
        Upload exactly two PDFs to see a page-by-page text diff between them.
      </p>
      <div className="mt-8">
        <CompareTool />
      </div>
    </main>
  );
}
