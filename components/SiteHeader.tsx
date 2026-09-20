/**
 * The site header.
 *
 * One deliberate departure from the reference design this is modelled on:
 * **no Log in / Sign up.** The service is unauthenticated on purpose — "no
 * keys, tokens or login", in the README's words — so there is nothing for
 * those two controls to do, and no account for them to lead to. The space is
 * simply empty.
 *
 * Search lives here too, not just in the homepage hero: the IA decision
 * (Phase 3, Gate 3) was that search has to be reachable from every page, not
 * only the one a visitor happens to land on. It's the same `ToolSearch`
 * component the hero uses, mounted a second time with its own URL sync
 * disabled (`syncUrlParam={false}`) — the homepage's `?q=` and the header's
 * query are deliberately independent, so a filtered homepage view doesn't
 * fight a header search on the same page for one query string.
 *
 * These links keep `next/link`'s default prefetch: there are four of them
 * (three popular conversions plus `/about`), they are above the fold on every
 * page, and preloading them is what makes moving around the site feel
 * immediate. `ToolsMenu`'s panel and the footer, which carry the full
 * catalog, opt out — see `ToolCard`.
 *
 * `ToolsMenu` is the one interactive piece of navigation, a click-toggled
 * mega menu grouped by `lib/categories.ts` — see its own doc comment for why
 * a toggled panel rather than the hover-only kind a menu like this usually
 * gets.
 *
 * `.site-header-search` and `.site-nav` both disappear below 880px — a search
 * box and a five-item link list don't fit a phone-width header bar at once —
 * and `MobileHeaderControls` takes their place: two icons, search and menu,
 * each opening the thing it stands for as a full-width panel under the
 * header instead of inline.
 */
import Link from "next/link";
import { Suspense } from "react";

import { MobileHeaderControls } from "@/components/MobileHeaderControls";
import { ToolSearch } from "@/components/ToolSearch";
import { ToolsMenu } from "@/components/ToolsMenu";
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

        {/* `ToolSearch` reads `useSearchParams`, which Next requires a
            Suspense boundary around for a statically-rendered page — the
            header is on every route, including the fully static ones. */}
        <div className="site-header-search">
          <Suspense fallback={<div className="tool-search-input" aria-hidden="true" />}>
            <ToolSearch placeholder="Search tools" syncUrlParam={false} />
          </Suspense>
        </div>

        <nav className="site-nav" aria-label="Conversions">
          {POPULAR.slice(0, 3).map((entry) => (
            <Link key={entry.slug} href={`/${entry.slug}`}>
              {entry.heading}
            </Link>
          ))}
          <ToolsMenu />
          <Link href="/about">About</Link>
        </nav>

        <MobileHeaderControls />
      </div>
    </header>
  );
}
