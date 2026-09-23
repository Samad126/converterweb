import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { formatBytes } from "@/lib/format";
import { ConverterShell } from "@/components/converter/ConverterShell";

/**
 * `/tools/extract-tables` — a standalone extraction tool, not a catalog page.
 *
 * `.docx` and `.docm` can also reach the `tables` target: an Excel workbook
 * holding only the source document's tables, one sheet per table, with none
 * of the surrounding prose. That is table extraction, not a general Word
 * conversion, so — like `/tools/psd-to-layers` — this reuses `ConverterShell`
 * directly, locked to `tables` and narrowed to the two Word extensions that
 * reach it, rather than gaining a catalog page. See the note in
 * `lib/content/catalog.ts` for the full reasoning.
 */
export const metadata: Metadata = {
  title: "Extract tables from Word — Free Online Table Extractor",
  description:
    "Pull just the tables out of a Word document into an Excel workbook, one sheet per table. Free, no sign-up, no file left on the server.",
  alternates: { canonical: "/tools/extract-tables" },
};

export default function ExtractTablesPage(): React.ReactElement {
  return (
    <main id="content" className="shell py-10 sm:py-14">
      <Breadcrumbs
        crumbs={[
          ["Home", "/"],
          ["Extract tables from Word", "/tools/extract-tables"],
        ]}
      />

      <h1 className="page-title">Extract tables from a Word document</h1>
      <p className="page-lede">
        Upload a Word document and get back an Excel workbook holding only its tables, one sheet
        per table, with none of the surrounding prose.
      </p>

      <div className="conversion-aside-inner mt-8">
        <ConverterShell lockedTargetId="tables" acceptedExtensions={[".docx", ".docm"]} />
      </div>

      <hr className="hairline my-10" />

      <section className="flex flex-col gap-4">
        <h2 className="section-title">What to expect</h2>
        <ul className="fact-list">
          <li>Files accepted: .docx and .docm — up to {formatBytes(MAX_UPLOAD_BYTES)}.</li>
          <li>
            This is not a full document export: paragraphs, headings and images outside a table are
            dropped on purpose, so the workbook stays a workbook rather than a document wearing a
            spreadsheet&rsquo;s extension.
          </li>
          <li>A source with no tables at all produces an empty workbook rather than an error.</li>
        </ul>
      </section>

      <section className="mt-10 flex flex-col gap-4">
        <h2 className="section-title">Questions</h2>
        <dl className="fact-list">
          <div>
            <dt className="font-semibold">Is it free? Do I need an account?</dt>
            <dd>Free, with no account, no email and no sign-up.</dd>
          </div>
          <div>
            <dt className="font-semibold">What happens to my file?</dt>
            <dd>
              It is converted in a temporary workspace that is deleted before the response is sent
              back — on success, on failure, on timeout, and if you close the page mid-conversion.
            </dd>
          </div>
        </dl>
      </section>

      <p className="mt-10">
        Looking for a full document conversion instead? Try{" "}
        <Link href="/word_to_pdf">Word to PDF</Link> or <Link href="/">browse every conversion</Link>.
      </p>
    </main>
  );
}
