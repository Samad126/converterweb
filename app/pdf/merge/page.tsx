import type { Metadata } from "next";

import { MergeTool } from "@/components/pdf/MergeTool";

export const metadata: Metadata = {
  title: "Merge PDFs — Free Online PDF Tool",
  description: "Combine two or more PDFs into one, free online. No sign-up, no file left on the server.",
  alternates: { canonical: "/pdf/merge" },
};

export default function MergePage(): React.ReactElement {
  return (
    <main id="content" className="mx-auto w-full max-w-[760px] px-5 py-10 sm:py-14">
      <h1 className="page-title">Merge PDFs</h1>
      <p className="page-lede">
        Combine two or more PDFs into one, in the order you list them. Every page of every file is
        kept, in its own order.
      </p>
      <div className="mt-8">
        <MergeTool />
      </div>
    </main>
  );
}
