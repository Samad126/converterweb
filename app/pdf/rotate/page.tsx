import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { RotateTool } from "@/components/pdf/RotateTool";

export const metadata: Metadata = {
  title: "Rotate a PDF — Free Online PDF Tool",
  description: "Rotate one or more pages of a PDF, free online. No sign-up, no file left on the server.",
  alternates: { canonical: "/pdf/rotate" },
};

export default function RotatePage(): React.ReactElement {
  return (
    <main id="content" className="shell py-10 sm:py-14">
      <Breadcrumbs
        crumbs={[
          ["Home", "/"],
          ["PDF tools", "/pdf"],
          ["Rotate a PDF", "/pdf/rotate"],
        ]}
      />

      <h1 className="page-title">Rotate a PDF</h1>
      <p className="page-lede">
        Rotate every page, or just the ones you name, by a multiple of 90 degrees clockwise. Added
        to whatever rotation each page already has.
      </p>
      <div className="conversion-aside-inner mt-8">
        <RotateTool />
      </div>
    </main>
  );
}
