import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SplitTool } from "@/components/pdf/SplitTool";

export const metadata: Metadata = {
  title: "Split a PDF — Free Online PDF Tool",
  description: "Break a PDF into separate files, free online. No sign-up, no file left on the server.",
  alternates: { canonical: "/pdf/split" },
};

export default function SplitPage(): React.ReactElement {
  return (
    <main id="content" className="shell py-10 sm:py-14">
      <Breadcrumbs
        crumbs={[
          ["Home", "/"],
          ["PDF tools", "/pdf"],
          ["Split a PDF", "/pdf/split"],
        ]}
      />

      <h1 className="page-title">Split a PDF</h1>
      <p className="page-lede">
        Cut a PDF into consecutive chunks of however many pages you choose. You get back a ZIP of
        the parts, even when there is only one.
      </p>
      <div className="conversion-aside-inner mt-8">
        <SplitTool />
      </div>
    </main>
  );
}
