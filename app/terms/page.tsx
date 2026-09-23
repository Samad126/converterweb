import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { AUTHOR, SITE_NAME, absoluteUrl } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Terms of use",
  description: `The terms for using ${SITE_NAME}: free service, provided as is, no account, and what you may and may not upload.`,
  alternates: { canonical: "/terms" },
  openGraph: { url: absoluteUrl("/terms") },
};

export default function TermsPage(): React.ReactElement {
  return (
    <main id="content" className="shell py-10 sm:py-14">
      <Breadcrumbs crumbs={[["Home", "/"], ["Terms of use", "/terms"]]} />

      <header>
        <h1 className="page-title">Terms of use</h1>
        <p className="page-lede">Last updated 23 September 2026. By using this site you agree to these terms. If you do not agree, please do not use it.</p>
      </header>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="section-title">The service</h2>
        <p className="body-text">
          {SITE_NAME} converts files between formats and offers PDF tools, free of charge and without an account. It is a personal portfolio project run by {AUTHOR.name}, not a commercial service, and it may change, pause or stop at any time.
        </p>
      </section>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="section-title">Acceptable use</h2>
        <ul className="fact-list">
          <li>Only upload files you have the right to process.</li>
          <li>Do not upload illegal content, or malware intended to attack the service or anyone else.</li>
          <li>Do not try to overload, probe or bypass the limits of the service (file size, rate limits and timeouts exist to keep it available for everyone).</li>
          <li>Do not use automated scripts to send heavy volumes of requests.</li>
        </ul>
      </section>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="section-title">Your files and output</h2>
        <p className="body-text">
          You keep all rights to your files and to the converted output. The service only processes them to produce the result you asked for, as described in the <Link href="/privacy">privacy policy</Link>.
        </p>
        <p className="body-text">
          Conversions are done by open-source engines and can change layout, fonts, formatting or quality, and some features cannot be carried between formats. Check the result before relying on it.
        </p>
      </section>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="section-title">No warranty</h2>
        <p className="body-text">
          The service is provided “as is” and “as available”, without warranties of any kind, including that it will be uninterrupted, error-free, or that a conversion will be accurate or suitable for a particular purpose. Keep a copy of your original file; the service does not.
        </p>
      </section>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="section-title">Limitation of liability</h2>
        <p className="body-text">
          To the extent the law allows, the operator is not liable for any loss or damage arising from your use of the service, including lost or corrupted files or data. Nothing in these terms limits liability that cannot be limited by law.
        </p>
      </section>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="section-title">Open-source software</h2>
        <p className="body-text">
          The site and the service are open source under the MIT license (see the source on <a href={AUTHOR.githubFrontend} target="_blank" rel="noopener noreferrer">GitHub</a>), and they use other open-source software, including LibreOffice and FFmpeg, under those projects’ own licenses.
        </p>
      </section>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="section-title">Contact and changes</h2>
        <p className="body-text">
          Questions about these terms: <a href={`mailto:${AUTHOR.email}`}>{AUTHOR.email}</a>. These terms may be updated; the date at the top shows the latest version, and continued use means you accept the current one.
        </p>
      </section>
    </main>
  );
}
