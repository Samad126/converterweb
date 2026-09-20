import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageNumbersTool } from "@/components/pdf/PageNumbersTool";

export const metadata: Metadata = {
  title: "Add page numbers to a PDF — Free Online PDF Tool",
  description: "Stamp page numbers onto every page of a PDF, free online. No sign-up, no file left on the server.",
  alternates: { canonical: "/pdf/page-numbers" },
};

export default function PageNumbersPage(): React.ReactElement {
  return (
    <main id="content" className="shell py-10 sm:py-14">
      <Breadcrumbs
        crumbs={[
          ["Home", "/"],
          ["PDF tools", "/pdf"],
          ["Add page numbers to a PDF", "/pdf/page-numbers"],
        ]}
      />

      <h1 className="page-title">Add page numbers to a PDF</h1>
      <p className="page-lede">
        Draw a number on every page, counting up from wherever you choose to start. There is no
        partial mode — every page gets a number that agrees with its own position.
      </p>
      <div className="conversion-aside-inner mt-8">
        <PageNumbersTool />
      </div>
    </main>
  );
}
