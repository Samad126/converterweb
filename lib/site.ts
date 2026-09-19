/**
 * Where this site says it lives.
 *
 * A canonical URL and a sitemap are absolute by definition, so the origin has to
 * be written down somewhere. It is read once, here, and every absolute URL in
 * the app is built from it.
 *
 * **This is not a second copy of a deployment fact.** `NEXT_PUBLIC_CONVERTER_BASE_URL`
 * (the API) is a build argument that compose refuses to default, because getting
 * it wrong produces a page that looks fine and calls the wrong host. This is the
 * opposite case: the fallback below is the real production origin, so a build
 * that sets nothing still emits correct canonicals and a correct sitemap. The
 * override exists for a preview deployment or a fork, not because the default is
 * ever wrong in production.
 */

/**
 * The production origin, as a bare origin with no trailing slash.
 *
 * nginx fronts this hostname and forwards to the container on loopback:3011 —
 * see `docker-compose.yml` and `../backend/deploy/converter.alakbaroff.com.conf`.
 */
const PRODUCTION_ORIGIN = "https://converter.alakbaroff.com";

/**
 * The name used in `<title>` suffixes, structured data and the header wordmark.
 *
 * One line, and the only place it appears — renaming the product is this and
 * nothing else.
 */
export const SITE_NAME = "File Converter";

/** The site's origin, without a trailing slash. */
export function siteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return PRODUCTION_ORIGIN;

  // Tolerate a trailing slash in the environment rather than emitting
  // `https://host//word_to_pdf` in a canonical tag, which is a different URL to
  // a crawler and reads as a duplicate page.
  return configured.replace(/\/+$/, "");
}

/**
 * The absolute URL for a path.
 *
 * `path` is a site-relative path beginning with a slash. The root is `""` or
 * `"/"`, both of which produce the bare origin.
 */
export function absoluteUrl(path = "/"): string {
  const origin = siteOrigin();
  if (path === "" || path === "/") return origin;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
