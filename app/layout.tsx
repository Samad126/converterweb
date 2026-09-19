import type { Metadata, Viewport } from "next";

import "./globals.css";

/**
 * No fonts are fetched and no scripts come from anywhere else.
 *
 * The type is the system stack (`lib/globals.css`), so the page has no
 * third-party dependency at all: it renders identically on a machine that has
 * never been online, which is the point of the "offline-capable" requirement.
 */
export const metadata: Metadata = {
  title: "File converter",
  description:
    "Convert a document, spreadsheet, presentation or image to another format.",
  // Nothing about an upload is ever indexed or shared.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Both themes are supported; the browser chrome follows the same choice the
  // stylesheet does.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
