import type { Metadata } from "next";

import { RepairTool } from "@/components/pdf/RepairTool";

export const metadata: Metadata = {
  title: "Repair a damaged PDF — Free Online PDF Tool",
  description: "Recover a damaged PDF, free online. No sign-up, no file left on the server.",
  alternates: { canonical: "/pdf/repair" },
};

export default function RepairPage(): React.ReactElement {
  return (
    <main id="content" className="mx-auto w-full max-w-[760px] px-5 py-14">
      <h1 className="page-title">Repair a damaged PDF</h1>
      <p className="page-lede">
        Read and rewrite a PDF, fixing whatever the reader can recover from — a broken
        cross-reference table, a truncated update, a damaged linearization hint stream.
      </p>
      <div className="mt-8">
        <RepairTool />
      </div>
    </main>
  );
}
