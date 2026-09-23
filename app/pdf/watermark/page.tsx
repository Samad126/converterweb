import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { WatermarkTool } from "@/components/pdf/WatermarkTool";

export const metadata: Metadata = {
  title: "Watermark a PDF — Free Online PDF Tool",
  description: "Stamp text across every page of a PDF, free online. No sign-up, no file left on the server.",
  alternates: { canonical: "/pdf/watermark" },
};

export default function WatermarkPage(): React.ReactElement {
  return (
    <main id="content" className="shell py-10 sm:py-14">
      <Breadcrumbs
        crumbs={[
          ["Home", "/"],
          ["PDF tools", "/pdf"],
          ["Watermark a PDF", "/pdf/watermark"],
        ]}
      />

      <h1 className="page-title">Watermark a PDF</h1>
      <p className="page-lede">
        Stamp text across every page, or just the ones you name, semi-transparent and over the
        original content.
      </p>
      <div className="conversion-aside-inner mt-8">
        <WatermarkTool />
      </div>
    </main>
  );
}
