import type { Metadata } from "next";

import { ProtectTool } from "@/components/pdf/ProtectTool";

export const metadata: Metadata = {
  title: "Add a password to a PDF — Free Online PDF Tool",
  description: "Encrypt a PDF with a password, free online. No sign-up, no file left on the server.",
  alternates: { canonical: "/pdf/protect" },
};

export default function ProtectPage(): React.ReactElement {
  return (
    <main id="content" className="mx-auto w-full max-w-[760px] px-5 py-14">
      <h1 className="page-title">Add a password to a PDF</h1>
      <p className="page-lede">
        Encrypt a PDF with a password, used as both the user and owner password. A PDF that is
        already encrypted is refused — unlock it first.
      </p>
      <div className="mt-8">
        <ProtectTool />
      </div>
    </main>
  );
}
