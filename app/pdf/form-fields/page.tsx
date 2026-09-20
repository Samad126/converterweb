import type { Metadata } from "next";

import { FormFieldsTool } from "@/components/pdf/FormFieldsTool";

export const metadata: Metadata = {
  title: "Fill a PDF Form — Free Online PDF Tool",
  description: "Read a PDF's fillable fields and fill them in, free online. No sign-up, no file left on the server.",
  alternates: { canonical: "/pdf/form-fields" },
};

export default function FormFieldsPage(): React.ReactElement {
  return (
    <main id="content" className="mx-auto w-full max-w-[760px] px-5 py-14">
      <h1 className="page-title">Fill a PDF form</h1>
      <p className="page-lede">
        Read a PDF&rsquo;s AcroForm fields and fill in the ones you touch. Most PDFs have no form at
        all — that is shown plainly, not treated as an error.
      </p>
      <div className="mt-8">
        <FormFieldsTool />
      </div>
    </main>
  );
}
