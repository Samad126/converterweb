import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { RedactTool } from "@/components/pdf/RedactTool";

export const metadata: Metadata = {
  title: "Redact a PDF — Free Online PDF Tool",
  description: "Permanently remove sensitive content from a PDF, free online. No sign-up, no file left on the server.",
  alternates: { canonical: "/pdf/redact" },
};

export default function RedactPage(): React.ReactElement {
  return (
    <main id="content" className="shell py-10 sm:py-14">
      <Breadcrumbs
        crumbs={[
          ["Home", "/"],
          ["PDF tools", "/pdf"],
          ["Redact a PDF", "/pdf/redact"],
        ]}
      />

      <h1 className="page-title">Redact a PDF</h1>
      <p className="page-lede">
        Permanently remove the text, images and graphics under one or more rectangles — this is
        real deletion, not a black box drawn over the top.
      </p>
      <div className="conversion-aside-inner mt-8">
        <RedactTool />
      </div>
    </main>
  );
}
