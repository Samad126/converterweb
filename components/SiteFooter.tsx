/**
 * The site footer.
 *
 * This is where all thirty-six document conversions are linked from every
 * page, alongside a handful of popular audio/video pairs and the three hubs
 * themselves. That is a lot of links for a footer, and it is the reason the
 * header can stay short: the crawl depth to any conversion page is one,
 * everywhere, without a dropdown menu and without a client component.
 *
 * The document conversions come from `entriesByFamily()`; the media pairs are
 * pulled from `POPULAR_AUDIO`/`POPULAR_VIDEO` rather than listed by hand, so a
 * renamed slug throws here rather than shipping a dead link, and the full
 * per-pair set stays reachable one hop away at `/audio` and `/video`.
 *
 * `prefetch={false}`, like the grid: several sets of links on the same
 * page would otherwise preload dozens of pages nobody is going to open.
 *
 * The limits are restated here rather than only on the tool page, because a
 * person who lands on a conversion page from a search engine never sees the
 * tool page's own footer.
 */
import Link from "next/link";

import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { entriesByFamily } from "@/lib/catalog";
import { POPULAR_AUDIO, POPULAR_VIDEO } from "@/lib/mediaCatalog";
import { formatBytes } from "@/lib/format";
import { AUTHOR } from "@/lib/site";

const SERVER_TIMEOUT_SECONDS = 90;
const CLIENT_TIMEOUT_SECONDS = 120;

/** How many popular media pairs each footer column links, to stay to a column. */
const POPULAR_MEDIA_LINKS = 5;

export function SiteFooter(): React.ReactElement {
  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="footer-columns">
          {entriesByFamily().map((group) => (
            <nav key={group.key} aria-label={`${group.label} conversions`}>
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

          <nav aria-label="Audio conversions">
            <h2 className="footer-heading">Audio</h2>
            <ul className="footer-list">
              {POPULAR_AUDIO.slice(0, POPULAR_MEDIA_LINKS).map((entry) => (
                <li key={entry.slug}>
                  <Link href={entry.route} prefetch={false}>
                    {entry.heading}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/audio" prefetch={false}>
                  All audio conversions
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Video conversions">
            <h2 className="footer-heading">Video</h2>
            <ul className="footer-list">
              {POPULAR_VIDEO.slice(0, POPULAR_MEDIA_LINKS).map((entry) => (
                <li key={entry.slug}>
                  <Link href={entry.route} prefetch={false}>
                    {entry.heading}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/video" prefetch={false}>
                  All video conversions
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="The converter">
            <h2 className="footer-heading">The converter</h2>
            <ul className="footer-list">
              <li>
                <Link href="/conversions">All conversions</Link>
              </li>
              <li>
                <Link href="/audio">Audio conversion</Link>
              </li>
              <li>
                <Link href="/video">Video conversion</Link>
              </li>
              <li>
                <Link href="/pdf">PDF tools</Link>
              </li>
              <li>
                <Link href="/tools">Extra tools</Link>
              </li>
              <li>
                <Link href="/">Home</Link>
              </li>
              <li>
                <Link href="/about">About</Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="About the author">
            <h2 className="footer-heading">{AUTHOR.name}</h2>
            <ul className="footer-list">
              <li>
                <a href={AUTHOR.githubFrontend} target="_blank" rel="noopener noreferrer">
                  Frontend on GitHub
                </a>
              </li>
              <li>
                <a href={AUTHOR.githubBackend} target="_blank" rel="noopener noreferrer">
                  Backend on GitHub
                </a>
              </li>
              <li>
                <a href={AUTHOR.portfolio} target="_blank" rel="noopener noreferrer">
                  Portfolio
                </a>
              </li>
              <li>
                <a href={AUTHOR.linkedin} target="_blank" rel="noopener noreferrer">
                  LinkedIn
                </a>
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
