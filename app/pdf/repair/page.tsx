import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { RepairTool } from "@/components/pdf/RepairTool";

export const metadata: Metadata = {
  title: "Repair a damaged PDF — Free Online PDF Tool",
  description: "Recover a damaged PDF, free online. No sign-up, no file left on the server.",
  alternates: { canonical: "/pdf/repair" },
};

export default function RepairPage(): React.ReactElement {
  return (
    <main id="content" className="shell py-10 sm:py-14">
      <Breadcrumbs
        crumbs={[
          ["Home", "/"],
          ["PDF tools", "/pdf"],
          ["Repair a damaged PDF", "/pdf/repair"],
        ]}
      />

      <h1 className="page-title">Repair a damaged PDF</h1>
      <p className="page-lede">
        Read and rewrite a PDF, fixing whatever the reader can recover from — a broken
        cross-reference table, a truncated update, a damaged linearization hint stream.
      </p>
      <div className="conversion-aside-inner mt-8">
        <RepairTool />
      </div>
    </main>
  );
}
