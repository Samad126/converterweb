import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AUTHOR, SITE_NAME, absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `Who built ${SITE_NAME} and why — a converter with two open-source repositories, a Node.js/LibreOffice service and a Next.js client.`,
  alternates: { canonical: "/about" },
  openGraph: { url: absoluteUrl("/about") },
};

export default function AboutPage(): React.ReactElement {
  return (
    <main id="content" className="shell py-10 sm:py-14">
      <Breadcrumbs crumbs={[["Home", "/"], ["About", "/about"]]} />

      <header>
        <h1 className="page-title">About</h1>
        <p className="page-lede">
          {SITE_NAME} converts documents, spreadsheets, presentations and images
          between formats, free and without an account. It is a two-repository
          project: a Node.js service that does the converting, and the Next.js
          site you&rsquo;re looking at.
        </p>
      </header>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="section-title">How it&rsquo;s built</h2>
        <p className="body-text">
          The service (<code>converterapi</code>) is a Node.js backend with no
          database and no stored state — every file is handled in a temporary
          workspace that is deleted before the response is sent. It began as
          the backend for an Android app that uploads a Word document and gets
          a PDF back, and that contract still holds today.
        </p>
        <p className="body-text">
          LibreOffice headless does the core document conversions, but it is
          not the only engine: PDF page operations (merge, split, rotate,
          watermark and the rest) run on <code>pdf-lib</code>, PDF pages are
          rasterized with poppler&rsquo;s <code>pdftoppm</code>, password
          protection uses <code>qpdf</code>, a PDF exporting to Word,
          PowerPoint, Excel or Markdown goes through a separate Python engine
          LibreOffice has no filter for, PSD layer extraction uses{" "}
          <code>ag-psd</code>, and OCR runs through <code>ocrmypdf</code> and
          Tesseract. Each tool uses whichever of these actually does that job.
        </p>
        <p className="body-text">
          This site (<code>converterweb</code>) is the browser client: Next.js
          (App Router), TypeScript and Tailwind, tested with Vitest, React
          Testing Library and MSW. It talks to the service over the same
          public API the Android app uses — nothing here is a special path.
        </p>
        <div className="mt-2">
          <ul className="fact-list">
            <li>
              Frontend source:{" "}
              <a href={AUTHOR.githubFrontend} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            </li>
            <li>
              Backend source:{" "}
              <a href={AUTHOR.githubBackend} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            </li>
          </ul>
        </div>
      </section>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="section-title">Who built it</h2>
        <p className="body-text">
          {AUTHOR.name}, {AUTHOR.role}.
        </p>
        <ul className="fact-list">
          <li>
            Portfolio:{" "}
            <a href={AUTHOR.portfolio} target="_blank" rel="noopener noreferrer">
              alakbaroff.com
            </a>
          </li>
          <li>
            LinkedIn:{" "}
            <a href={AUTHOR.linkedin} target="_blank" rel="noopener noreferrer">
              LinkedIn
            </a>
          </li>
          <li>
            Email:{" "}
            <a href={`mailto:${AUTHOR.email}`}>{AUTHOR.email}</a>
          </li>
        </ul>
      </section>
    </main>
  );
}
