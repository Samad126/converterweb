import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { AUTHOR, SITE_NAME, absoluteUrl } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Desktop app privacy policy",
  description: `How the ${SITE_NAME} desktop app handles your data: files are converted on your own computer, there is no account or telemetry, and the only network use is downloads you ask for.`,
  alternates: { canonical: "/privacy/desktop" },
  openGraph: { url: absoluteUrl("/privacy/desktop") },
};

export default function DesktopPrivacyPage(): React.ReactElement {
  return (
    <main id="content" className="shell py-10 sm:py-14">
      <Breadcrumbs
        crumbs={[
          ["Home", "/"],
          ["Privacy policy", "/privacy"],
          ["Desktop app", "/privacy/desktop"],
        ]}
      />

      <header>
        <h1 className="page-title">Desktop app privacy policy</h1>
        <p className="page-lede">
          Last updated 20 November 2026. The short version: the desktop app
          converts files on your own computer, has no account and no
          telemetry, and sends nothing about you or your files to anyone. This
          page covers the downloadable app; the website has its own{" "}
          <Link href="/privacy">privacy policy</Link>.
        </p>
      </header>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="section-title">Your files</h2>
        <p className="body-text">
          Conversions run locally. A file you convert is never uploaded. While
          a conversion runs, the app uses a temporary working folder in your
          user cache directory and deletes it when the job ends. The result is
          written next to the original file, or to the folder you chose in
          Settings.
        </p>
      </section>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="section-title">What the app stores on your computer</h2>
        <ul className="fact-list">
          <li>Your settings (output folder, overwrite choice, quick-convert ring options, autostart), in a small file in your user configuration folder.</li>
          <li>Converters you chose to install from the Engines page, in the app&rsquo;s data folder. Removing one from the same page deletes it.</li>
          <li>Nothing is kept about the files you converted, and no history is sent anywhere.</li>
        </ul>
      </section>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="section-title">When the app uses the network</h2>
        <p className="body-text">
          The app makes a network connection only when you ask it to:
        </p>
        <ul className="fact-list">
          <li>
            <strong>Installing a converter</strong> (such as LibreOffice,
            Calibre, ffmpeg, pandoc or the Python tools) downloads it from its
            publisher&rsquo;s release host, or, for Python packages, from the
            Python Package Index. Each download is pinned to a fixed address and
            checksum and verified before use. Those hosts see your IP address
            like any download.
          </li>
          <li>
            <strong>Downloading a video link</strong> contacts the video site
            you entered, through the yt-dlp tool.
          </li>
        </ul>
        <p className="body-text">
          Nothing else is sent: no usage statistics, crash reports,
          identifiers or advertising. The app does not contact the author or
          this website.
        </p>
      </section>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="section-title">Quick-convert ring and input</h2>
        <p className="body-text">
          To open the ring when you hold Ctrl (Option on macOS) and drag files,
          the app watches global mouse and keyboard events while it runs in the
          background. It uses them only to detect that gesture. It does not
          record, store or transmit what you type or do, and you can turn the
          ring off in Settings. On macOS the system asks for Accessibility
          permission first.
        </p>
      </section>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="section-title">Third-party tools</h2>
        <p className="body-text">
          Conversions are done by programs that run on your computer, such as
          LibreOffice, ffmpeg and pandoc. They run locally and are not
          configured by the app to send data anywhere. Their own licences and
          policies apply to them.
        </p>
      </section>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="section-title">Source and contact</h2>
        <p className="body-text">
          The app is open source, so each claim above can be checked in the
          code:{" "}
          <a href={AUTHOR.githubDesktop} target="_blank" rel="noopener noreferrer">
            desktop app
          </a>{" "}
          and{" "}
          <a href={AUTHOR.githubCore} target="_blank" rel="noopener noreferrer">
            conversion library
          </a>
          . Questions: <a href={`mailto:${AUTHOR.email}`}>{AUTHOR.email}</a>.
        </p>
      </section>
    </main>
  );
}
