import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { OcrTool } from "@/components/pdf/OcrTool";

export const metadata: Metadata = {
  title: "OCR a PDF — Free Online PDF Tool",
  description: "Make a scanned PDF searchable, free online. No sign-up, no file left on the server.",
  alternates: { canonical: "/pdf/ocr" },
};

export default function OcrPage(): React.ReactElement {
  return (
    <main id="content" className="shell py-10 sm:py-14">
      <Breadcrumbs
        crumbs={[
          ["Home", "/"],
          ["PDF tools", "/pdf"],
          ["OCR a PDF", "/pdf/ocr"],
        ]}
      />

      <h1 className="page-title">OCR a PDF</h1>
      <p className="page-lede">
        Upload a scanned PDF and get back a searchable one, with a real text layer instead of a
        picture of the page. A PDF that already has extractable text is returned unchanged unless
        you ask to re-OCR it.
      </p>
      <div className="conversion-aside-inner mt-8">
        <OcrTool />
      </div>
    </main>
  );
}
