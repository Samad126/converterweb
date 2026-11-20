import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { AUTHOR, SITE_NAME, absoluteUrl } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Download the desktop app",
  description: `${SITE_NAME} as a free, open-source native desktop app for Windows, Linux and macOS: it converts on your own computer, so files never leave it.`,
  alternates: { canonical: "/download" },
  openGraph: { url: absoluteUrl("/download") },
};

const RELEASES = `${AUTHOR.githubDesktop}/releases/latest`;

const PLATFORMS = [
  {
    name: "Windows",
    detail: "Windows 10 and 11, 64-bit.",
    how: "Download the setup program and run it. It installs for your user only and does not ask for administrator rights. A portable archive is also offered.",
  },
  {
    name: "macOS",
    detail: "macOS 11 or newer, Apple Silicon.",
    how: "Download the archive, unzip it and drag Converter into Applications. It is not notarised yet, so the first time, right-click the app and choose Open.",
  },
  {
    name: "Linux",
    detail: "64-bit, X11 or Wayland.",
    how: "Download the archive, extract it and run the install script inside. It installs for your user only; the script also has an uninstall option.",
  },
] as const;

export default function DownloadPage(): React.ReactElement {
  return (
    <main id="content" className="shell py-10 sm:py-14">
      <Breadcrumbs crumbs={[["Home", "/"], ["Download", "/download"]]} />

      <header>
        <h1 className="page-title">Download the desktop app</h1>
        <p className="page-lede">
          The same converter as this site, as a native app. It is written
          entirely in Rust, has no browser engine inside, runs offline and
          converts on your own computer, so your files never leave it. Free and
          open source.
        </p>
        <p className="mt-6">
          <a
            className="btn"
            href={RELEASES}
            target="_blank"
            rel="noopener noreferrer"
          >
            Get the latest release
          </a>
        </p>
      </header>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="section-title">Pick your system</h2>
        <ul className="flex flex-col gap-4">
          {PLATFORMS.map((platform) => (
            <li key={platform.name}>
              <h3 className="font-semibold">{platform.name}</h3>
              <p className="meta">{platform.detail}</p>
              <p className="body-text">{platform.how}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="section-title">What it does</h2>
        <ul className="fact-list">
          <li>Converts documents, images, audio, video, e-books, data files, archives and e-mail.</li>
          <li>PDF tools: merge, split, edit, sign, redact, compare and more.</li>
          <li>Hold Ctrl (Option on macOS) while dragging files to open a quick-convert ring at the pointer.</li>
          <li>
            Larger converters such as LibreOffice, Calibre and ffmpeg are
            installed from inside the app only when you ask for them. Each
            download is pinned to a checksum and verified before use.
          </li>
        </ul>
      </section>

      <section className="mt-12 flex flex-col gap-4" id="code-signing">
        <h2 className="section-title">Code signing</h2>
        <p className="body-text">
          Windows builds of this project use free code signing provided by the{" "}
          <a href="https://signpath.org" target="_blank" rel="noopener noreferrer">
            SignPath Foundation
          </a>
          , with a certificate issued in the name of the SignPath Foundation.
          Until signing is approved and active, Windows SmartScreen may warn
          about the installer; you can verify what you downloaded against the
          public build logs on GitHub.
        </p>
      </section>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="section-title">Privacy</h2>
        <p className="body-text">
          The app has no accounts and no telemetry, and it sends nothing about
          you or your files anywhere. Its only network use is downloading a
          converter you chose to install, or a video you asked it to fetch.
        </p>
      </section>

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="section-title">Source</h2>
        <ul className="fact-list">
          <li>
            Desktop app:{" "}
            <a href={AUTHOR.githubDesktop} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </li>
          <li>
            Conversion library:{" "}
            <a href={AUTHOR.githubCore} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </li>
        </ul>
      </section>
    </main>
  );
}
