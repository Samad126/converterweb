import type { Metadata, Viewport } from "next";

import { JsonLd } from "@/components/JsonLd";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { webSite } from "@/lib/schema";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

import "./globals.css";

/**
 * The site shell: the head tags every page inherits, and the header and footer
 * around whatever the route renders.
 *
 * **Indexing is on now, and that is a change of policy rather than a detail.**
 * This app used to be one page carrying `robots: { index: false, follow: false }`
 * on the reasoning that "nothing about an upload is ever indexed or shared".
 * That reasoning still holds for uploads — they are still never indexed, and
 * there is still nothing on any page about anyone's file — but the rule was
 * applied to the whole site, which left the pages themselves unindexable and the
 * product invisible. The site now has content worth indexing, so the default is
 * flipped and the note about uploads moved to where it is actually true: the
 * privacy sentence on the page and in the footer.
 *
 * `title.template` is what appends the site name, so a page sets only its own
 * half — see `lib/catalog.ts`, where every page title stops before the "|".
 */
export const metadata: Metadata = {
  // Absolute URLs for anything the metadata below leaves relative. The origin
  // itself lives in `lib/site.ts`, not here.
  metadataBase: new URL(absoluteUrl("/")),
  title: {
    default: `${SITE_NAME} — convert documents, spreadsheets, presentations and images`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Convert Word, Excel, PowerPoint, ODT, ODS, ODP, CSV, TXT, HTML, RTF, PNG and JPG files to PDF and other formats, free and without an account. Nothing is installed and no file is kept.",
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: absoluteUrl("/"),
    title: `${SITE_NAME} — convert documents, spreadsheets, presentations and images`,
    description:
      "Convert Word, Excel, PowerPoint, images and more to PDF and other formats, free and without an account.",
    // No `images`: there is no `public/` directory and no generated OG image —
    // see the README. A link preview falls back to the title and description.
  },
  twitter: { card: "summary" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Both themes are supported; the browser chrome follows the same choice the
  // stylesheet does, and these two are `--paper` from each — the app canvas,
  // not the card surface, because the chrome sits against the page's edge.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

/**
 * No fonts are fetched and no scripts come from anywhere else.
 *
 * The type is the system stack (`app/globals.css`), so every page renders
 * identically on a machine that has never been online. The JSON-LD above is the
 * only script on the site, and it is generated here rather than loaded.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="en">
      <body>
        {/* First in the tab order, and hidden until it is focused. */}
        <a className="skip-link" href="#content">
          Skip to the converter
        </a>

        <JsonLd document={webSite()} />

        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
