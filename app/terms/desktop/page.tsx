import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { AUTHOR, SITE_NAME, absoluteUrl } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Desktop app terms of use",
  description: `The terms for using the ${SITE_NAME} desktop app: free open-source software, provided as is, running on your own computer.`,
  alternates: { canonical: "/terms/desktop" },
  openGraph: { url: absoluteUrl("/terms/desktop") },
};

export default function DesktopTermsPage(): React.ReactElement {
  return (
    <main id="content" className="shell py-10 sm:py-14">
      <Breadcrumbs
        crumbs={[
          ["Home", "/"],
          ["Terms of use", "/terms"],
          ["Desktop app", "/terms/desktop"],
        ]}
      />

      <header>
        <h1 className="page-title">Desktop app terms of use</h1>
        <p className="page-lede">
          Last updated 20 November 2026. By installing or using the desktop app
          you agree to these terms. If you do not agree, please do not use it.
          They cover the downloadable app; the website has its own{" "}
          <Link href="/terms">terms of use</Link>.
        </p>
      </header>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="section-title">The software</h2>
        <p className="body-text">
          The {SITE_NAME} desktop app converts files between formats and offers
          PDF tools on your own computer. It is free, open-source software
          made by {AUTHOR.name} as a personal project, not a commercial
          product, and it may change or stop being maintained at any time.
        </p>
      </section>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="section-title">Licence</h2>
        <p className="body-text">
          The app and its conversion library are released under the MIT
          licence; the full text is in each repository (
          <a href={AUTHOR.githubDesktop} target="_blank" rel="noopener noreferrer">desktop app</a>,{" "}
          <a href={AUTHOR.githubCore} target="_blank" rel="noopener noreferrer">conversion library</a>
          ). You may use, copy, modify and share it under that licence.
        </p>
      </section>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="section-title">Acceptable use</h2>
        <ul className="fact-list">
          <li>Only convert files you have the right to process, and only download videos where you are allowed to.</li>
          <li>Do not use the app to break the law or infringe someone else&rsquo;s rights.</li>
          <li>You are responsible for how you use the app and what you do with its output.</li>
        </ul>
      </section>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="section-title">Your files and output</h2>
        <p className="body-text">
          You keep all rights to your files and to the converted output. The
          app never uploads them; see the{" "}
          <Link href="/privacy/desktop">desktop app privacy policy</Link>.
          Conversions can change layout, fonts, formatting or quality, and some
          features cannot be carried between formats. The app writes results
          next to the original, and can replace an existing file if you turn
          that setting on. Keep a copy of anything important, and check the
          result before relying on it.
        </p>
      </section>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="section-title">Third-party software</h2>
        <p className="body-text">
          The app can download and run other programs when you ask it to, such
          as LibreOffice, Calibre, ffmpeg, pandoc, qpdf, 7-Zip, yt-dlp and
          Python packages. They belong to their own authors and are used under
          their own licences, which you accept by installing them. They are
          not part of this project and are not covered by these terms.
        </p>
      </section>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="section-title">Code signing</h2>
        <p className="body-text">
          Windows builds are intended to be signed with a certificate provided
          by the SignPath Foundation. Signing shows that a build came from the
          project&rsquo;s public build process; it is not a guarantee about the
          software. Until signing is active, builds are unsigned and your
          system may warn you.
        </p>
      </section>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="section-title">No warranty</h2>
        <p className="body-text">
          The software is provided &ldquo;as is&rdquo;, without warranty of any
          kind, including that it will be error-free, that a conversion will be
          accurate, or that it is fit for a particular purpose.
        </p>
      </section>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="section-title">Limitation of liability</h2>
        <p className="body-text">
          To the extent the law allows, the author is not liable for any loss
          or damage arising from use of the app, including lost or corrupted
          files or data. Nothing in these terms limits liability that cannot be
          limited by law.
        </p>
      </section>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="section-title">Contact and changes</h2>
        <p className="body-text">
          Questions: <a href={`mailto:${AUTHOR.email}`}>{AUTHOR.email}</a>.
          These terms may be updated; the date at the top shows the latest
          version, and continued use means you accept the current one.
        </p>
      </section>
    </main>
  );
}
