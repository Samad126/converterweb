/**
 * One conversion, as a card in the grid.
 *
 * `next/link`, so a click is a client-side navigation rather than a document
 * load — the grid is the main way around the site and it should not feel like a
 * page that reloads. It still renders an `<a href>` in the server HTML, so
 * nothing is lost for a crawler.
 *
 * `prefetch={false}` is the other half of that decision, and it is specific to
 * this component and the footer: between them they carry seventy-two links, and
 * letting Next preload every one that scrolls into view would spend real
 * bandwidth on pages the visitor is not going to open. The rest of the site's
 * links — five in the header, a handful of breadcrumbs and related conversions —
 * keep the default, because there the preload is cheap and it makes the click
 * instant.
 */
import Link from "next/link";

import { FormatPair } from "@/components/ui/FormatBadge";
import type { ConversionEntry } from "@/lib/content/catalog";

export function ToolCard({ entry }: { entry: ConversionEntry }): React.ReactElement {
  return (
    <Link
      className="tool-card"
      href={`/${entry.slug}`}
      prefetch={false}
      data-family={entry.source.family}
    >
      <FormatPair source={entry.source.badge} target={entry.targetBadge} />
      <span className="tool-card-title">{entry.heading}</span>
      <span className="tool-card-blurb">{entry.cardBlurb}</span>
    </Link>
  );
}
