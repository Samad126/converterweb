import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { RemovePagesTool } from "@/components/pdf/RemovePagesTool";

export const metadata: Metadata = {
  title: "Remove pages from a PDF — Free Online PDF Tool",
  description: "Delete specific pages from a PDF, free online. No sign-up, no file left on the server.",
  alternates: { canonical: "/pdf/remove-pages" },
};

export default function RemovePagesPage(): React.ReactElement {
  return (
    <main id="content" className="shell py-10 sm:py-14">
      <Breadcrumbs
        crumbs={[
          ["Home", "/"],
          ["PDF tools", "/pdf"],
          ["Remove pages from a PDF", "/pdf/remove-pages"],
        ]}
      />

      <h1 className="page-title">Remove pages from a PDF</h1>
      <p className="page-lede">
        Delete the pages you name, keeping everything else in its original order. Removing every
        page is refused.
      </p>
      <div className="conversion-aside-inner mt-8">
        <RemovePagesTool />
      </div>
    </main>
  );
}
