import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CompressTool } from "@/components/pdf/CompressTool";

export const metadata: Metadata = {
  title: "Compress a PDF — Free Online PDF Tool",
  description: "Shrink a PDF's file size, free online. No sign-up, no file left on the server.",
  alternates: { canonical: "/pdf/compress" },
};

export default function CompressPage(): React.ReactElement {
  return (
    <main id="content" className="shell py-10 sm:py-14">
      <Breadcrumbs
        crumbs={[
          ["Home", "/"],
          ["PDF tools", "/pdf"],
          ["Compress a PDF", "/pdf/compress"],
        ]}
      />

      <h1 className="page-title">Compress a PDF</h1>
      <p className="page-lede">
        Recompress a PDF to shrink it. Low is close to lossless; medium and high re-encode larger
        images as JPEG, more aggressively at the high setting.
      </p>
      <div className="conversion-aside-inner mt-8">
        <CompressTool />
      </div>
    </main>
  );
}
