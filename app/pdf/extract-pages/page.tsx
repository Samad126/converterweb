import type { Metadata } from "next";

import { ExtractPagesTool } from "@/components/pdf/ExtractPagesTool";

export const metadata: Metadata = {
  title: "Extract pages from a PDF — Free Online PDF Tool",
  description: "Pull specific pages into a new PDF, free online. No sign-up, no file left on the server.",
  alternates: { canonical: "/pdf/extract-pages" },
};

export default function ExtractPagesPage(): React.ReactElement {
  return (
    <main id="content" className="mx-auto w-full max-w-[760px] px-5 py-14">
      <h1 className="page-title">Extract pages from a PDF</h1>
      <p className="page-lede">
        Pull the pages you name into a new PDF, in the exact order you name them — so this can
        reorder as well as select.
      </p>
      <div className="mt-8">
        <ExtractPagesTool />
      </div>
    </main>
  );
}
