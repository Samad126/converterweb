import type { Metadata } from "next";

import { UnlockTool } from "@/components/pdf/UnlockTool";

export const metadata: Metadata = {
  title: "Remove a PDF's password — Free Online PDF Tool",
  description: "Decrypt a password-protected PDF, free online. No sign-up, no file left on the server.",
  alternates: { canonical: "/pdf/unlock" },
};

export default function UnlockPage(): React.ReactElement {
  return (
    <main id="content" className="mx-auto w-full max-w-[760px] px-5 py-14">
      <h1 className="page-title">Remove a PDF&rsquo;s password</h1>
      <p className="page-lede">
        Decrypt a password-protected PDF with the password that opens it. A wrong password is
        refused with a clear reason instead of a generic error.
      </p>
      <div className="mt-8">
        <UnlockTool />
      </div>
    </main>
  );
}
