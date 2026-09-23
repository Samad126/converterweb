import type { Metadata } from "next";
import Link from "next/link";

import { POPULAR } from "@/lib/catalog";

/**
 * The 404.
 *
 * A wrong URL is overwhelmingly likely to be a conversion we do not do. So
 * the page leads with what does exist rather than with an apology.
 *
 * `robots: noindex` because a 404 has no business in an index; Next already
 * serves this with a 404 status, and this makes it unambiguous.
 */
export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound(): React.ReactElement {
  return (
    <main id="content" className="mx-auto w-full max-w-[640px] px-5 py-10 sm:py-14">
      <header>
        <p className="eyebrow">404</p>
        <h1 className="page-title mt-3">That conversion does not exist</h1>
        <p className="page-lede">
          There is no converter at this address. Have a look at what this
          service does support below.
        </p>
      </header>

      <hr className="hairline my-8" />

      <section className="flex flex-col gap-3">
        <h2 className="section-title">Popular conversions</h2>
        <ul className="link-chips">
          {POPULAR.map((entry) => (
            <li key={entry.slug}>
              <Link className="link-chip" href={`/${entry.slug}`}>
                {entry.heading}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <hr className="hairline my-8" />

      <p className="body-text">
        Or <Link href="/conversions">see all conversions</Link> — every
        combination the service supports is listed there.
      </p>
    </main>
  );
}
