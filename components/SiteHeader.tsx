/**
 * The site header.
 *
 * Two deliberate departures from the reference design this is modelled on:
 *
 *   - **No Log in / Sign up.** The service is unauthenticated on purpose —
 *     "no keys, tokens or login", in the README's words — so there is nothing
 *     for those two controls to do, and no account for them to lead to. The
 *     space is simply empty.
 *   - **No dropdown menus.** A menu that opens on hover or click is a focus
 *     trap and a keyboard-navigation problem, and everything it would contain is
 *     a link that is already on `/conversions` and in the footer. The header
 *     carries a short list; the footer carries all of them.
 *
 * The header is therefore just the wordmark and a link list — there is no call
 * to action, because the page underneath it is already the choice it would be
 * asking you to make.
 *
 * These links keep `next/link`'s default prefetch: there are six of them, they
 * are above the fold on every page, and preloading them is what makes moving
 * around the site feel immediate. The grid and the footer, which carry
 * thirty-six apiece, opt out — see `ToolCard`.
 */
import Link from "next/link";

import { SITE_NAME } from "@/lib/site";
import { POPULAR } from "@/lib/catalog";

export function SiteHeader(): React.ReactElement {
  return (
    <header className="site-header">
      <div className="shell site-header-inner">
        <Link className="wordmark" href="/">
          {/* The name is split so the second half can be the inverted block —
              the same mark the design uses everywhere else for emphasis. */}
          <span className="wordmark-plain">File</span>
          <span className="wordmark-block">{SITE_NAME.split(" ").slice(1).join(" ")}</span>
        </Link>

        <nav className="site-nav" aria-label="Conversions">
          {POPULAR.slice(0, 4).map((entry) => (
            <Link key={entry.slug} href={`/${entry.slug}`}>
              {entry.heading}
            </Link>
          ))}
          <Link href="/conversions">All tools</Link>
        </nav>
      </div>
    </header>
  );
}
