import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ScanToPdfTool } from "@/components/pdf/ScanToPdfTool";

export const metadata: Metadata = {
  title: "Scan to PDF — Free Online PDF Tool",
  description: "Turn one or more photos into a PDF, free online. No sign-up, no file left on the server.",
  alternates: { canonical: "/pdf/scan-to-pdf" },
};

export default function ScanToPdfPage(): React.ReactElement {
  return (
    <main id="content" className="shell py-10 sm:py-14">
      <Breadcrumbs
        crumbs={[
          ["Home", "/"],
          ["PDF tools", "/pdf"],
          ["Scan to PDF", "/pdf/scan-to-pdf"],
        ]}
      />

      <h1 className="page-title">Scan to PDF</h1>
      <p className="page-lede">
        Turn one or more photos into a PDF, one page per photo, each page sized to its own image.
        Portrait and landscape photos in the same batch are both handled correctly.
      </p>
      <div className="conversion-aside-inner mt-8">
        <ScanToPdfTool />
      </div>
    </main>
  );
}
