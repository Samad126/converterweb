import type { Metadata } from "next";

import { RedactTool } from "@/components/pdf/RedactTool";

export const metadata: Metadata = {
  title: "Redact a PDF — Free Online PDF Tool",
  description: "Permanently remove sensitive content from a PDF, free online. No sign-up, no file left on the server.",
  alternates: { canonical: "/pdf/redact" },
};

export default function RedactPage(): React.ReactElement {
  return (
    <main id="content" className="mx-auto w-full max-w-[760px] px-5 py-14">
      <h1 className="page-title">Redact a PDF</h1>
      <p className="page-lede">
        Permanently remove the text, images and graphics under one or more rectangles — this is
        real deletion, not a black box drawn over the top.
      </p>
      <div className="mt-8">
        <RedactTool />
      </div>
    </main>
  );
}
