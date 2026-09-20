import type { Metadata } from "next";

import { SignTool } from "@/components/pdf/SignTool";

export const metadata: Metadata = {
  title: "Sign a PDF — Free Online PDF Tool",
  description: "Stamp a signature, initials, a company stamp, name, date or text onto a PDF, free online. No sign-up, no file left on the server.",
  alternates: { canonical: "/pdf/sign" },
};

export default function SignPage(): React.ReactElement {
  return (
    <main id="content" className="mx-auto w-full max-w-[760px] px-5 py-14">
      <h1 className="page-title">Sign a PDF</h1>
      <p className="page-lede">
        Stamp a signature, initials, a company stamp, a name, a date or free text onto exact page
        positions. This is a visual mark only — never a certificate-based digital signature.
      </p>
      <div className="mt-8">
        <SignTool />
      </div>
    </main>
  );
}
