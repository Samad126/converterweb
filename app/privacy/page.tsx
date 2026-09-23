import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { AUTHOR, SITE_NAME, absoluteUrl } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `How ${SITE_NAME} handles your files and data: files are converted in a temporary workspace and deleted, and there are no accounts, cookies or advertising trackers.`,
  alternates: { canonical: "/privacy" },
  openGraph: { url: absoluteUrl("/privacy") },
};

export default function PrivacyPage(): React.ReactElement {
  return (
    <main id="content" className="shell py-10 sm:py-14">
      <Breadcrumbs crumbs={[["Home", "/"], ["Privacy policy", "/privacy"]]} />

      <header>
        <h1 className="page-title">Privacy policy</h1>
        <p className="page-lede">Last updated 23 September 2026. The short version: your files are used to convert them and nothing else, and there is no account, advertising or tracking on this site.</p>
      </header>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="section-title">Your files</h2>
        <p className="body-text">
          When you convert a file, it is uploaded to the conversion service, converted in a temporary workspace, and the result is sent back to you. The workspace is deleted when the request ends — on success, on failure, on timeout, and if you close the page mid-conversion. Audio and video are transcoded as a background job, so their workspace lives until that job finishes and is then deleted. Files are not read by a person, not used to train anything, not sold and not shared.
        </p>
      </section>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="section-title">What the server records</h2>
        <ul className="fact-list">
          <li>One log line per request: a request id, the outcome (<code>ok</code> or <code>error</code>), the file extension, the target format, the HTTP status, an error code when the request failed (such as <code>E_UNSUPPORTED</code> or <code>E_CONVERT_FAILED</code>), the byte size and the duration.</li>
          <li><strong>Document contents and filenames are never logged.</strong></li>
          <li>The service uses your IP address to rate-limit requests. The host and any proxy in front of the site (such as Cloudflare) may also process IP addresses and request metadata in their own logs as part of delivering the site.</li>
        </ul>
      </section>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="section-title">What this website stores</h2>
        <ul className="fact-list">
          <li>No accounts and no sign-up.</li>
          <li>No cookies, and nothing is kept in your browser’s local storage for tracking.</li>
          <li>No advertising, analytics or third-party trackers, and no third-party fonts.</li>
          <li>If the page hits an unexpected error, a short error report may be sent to the operator: the error message, a stack trace and the page path. It never includes your files or filenames.</li>
        </ul>
      </section>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="section-title">Your choices</h2>
        <p className="body-text">
          Because nothing about you is stored, there is no profile to access, correct or delete. If you quoted a request id in an email and want the matching log line removed, or have any privacy question, write to <a href={`mailto:${AUTHOR.email}`}>{AUTHOR.email}</a>.
        </p>
        <p className="body-text">
          A file you convert is your responsibility: do not upload anything you have no right to process. Sensitive documents are best converted on a machine you control.
        </p>
      </section>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="section-title">Changes</h2>
        <p className="body-text">
          If this policy changes, the date at the top changes with it. The source of both the site and the service is public, so what the code does can be checked against what is written here.
        </p>
      </section>
    </main>
  );
}
