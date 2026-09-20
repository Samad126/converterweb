import type { Metadata } from "next";

import { OrganizeTool } from "@/components/pdf/OrganizeTool";

export const metadata: Metadata = {
  title: "Organize a PDF's pages — Free Online PDF Tool",
  description: "Reorder a PDF's pages, free online. No sign-up, no file left on the server.",
  alternates: { canonical: "/pdf/organize" },
};

export default function OrganizePage(): React.ReactElement {
  return (
    <main id="content" className="mx-auto w-full max-w-[760px] px-5 py-14">
      <h1 className="page-title">Organize a PDF&rsquo;s pages</h1>
      <p className="page-lede">
        Rearrange every page into a new order. Unlike extracting pages, this refuses an order that
        would drop or duplicate a page — use Remove pages or Extract pages for that.
      </p>
      <div className="mt-8">
        <OrganizeTool />
      </div>
    </main>
  );
}
