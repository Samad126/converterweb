import type { Metadata } from "next";

import { CropTool } from "@/components/pdf/CropTool";

export const metadata: Metadata = {
  title: "Crop a PDF — Free Online PDF Tool",
  description: "Trim a PDF's page margins, free online. No sign-up, no file left on the server.",
  alternates: { canonical: "/pdf/crop" },
};

export default function CropPage(): React.ReactElement {
  return (
    <main id="content" className="mx-auto w-full max-w-[760px] px-5 py-14">
      <h1 className="page-title">Crop a PDF</h1>
      <p className="page-lede">
        Trim points off any edge of every page, or just the ones you name. This shrinks the crop
        box; the trimmed area still exists in the file, only outside what a viewer or printer
        shows.
      </p>
      <div className="mt-8">
        <CropTool />
      </div>
    </main>
  );
}
