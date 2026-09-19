/**
 * The site footer.
 *
 * This is where all thirty-six conversions are linked from every page. That is
 * a lot of links for a footer, and it is the reason the header can stay short:
 * the crawl depth to any conversion page is one, everywhere, without a dropdown
 * menu and without a client component.
 *
 * `prefetch={false}`, like the grid: two sets of thirty-six links on the same
 * page would otherwise preload dozens of pages nobody is going to open.
 *
 * The limits are restated here rather than only on the tool page, because a
 * person who lands on a conversion page from a search engine never sees the
 * tool page's own footer.
 */
import Link from "next/link";

import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { entriesByFamily } from "@/lib/catalog";
import { formatBytes } from "@/lib/format";

const SERVER_TIMEOUT_SECONDS = 90;
const CLIENT_TIMEOUT_SECONDS = 120;

export function SiteFooter(): React.ReactElement {
  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="footer-columns">
          {entriesByFamily().map((group) => (
            <nav key={group.family} aria-label={`${group.label} conversions`}>
              <h2 className="footer-heading">{group.label}</h2>
              <ul className="footer-list">
                {group.entries.map((entry) => (
                  <li key={entry.slug}>
                    <Link href={`/${entry.slug}`} prefetch={false}>
                      {entry.heading}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <nav aria-label="The converter">
            <h2 className="footer-heading">The converter</h2>
            <ul className="footer-list">
              <li>
                <Link href="/conversions">All conversions</Link>
              </li>
              <li>
                <Link href="/">Home</Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="footer-note">
          <p className="meta">
            Files up to {formatBytes(MAX_UPLOAD_BYTES)}. A conversion that takes
            longer than {SERVER_TIMEOUT_SECONDS} seconds is stopped by the
            server; the page gives up at {CLIENT_TIMEOUT_SECONDS}. Files are
            converted in a temporary workspace that is deleted before the
            response is sent, and document contents and filenames are never
            logged. No account, no sign-up, nothing stored in this browser.
          </p>
        </div>
      </div>
    </footer>
  );
}
