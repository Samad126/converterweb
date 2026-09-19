import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";

/**
 * The robots file.
 *
 * Everything is allowed. There is no admin area, no user content and no
 * session-dependent view of anything — the API is a different origin and is not
 * this file's business — so there is no path worth disallowing, and a
 * `Disallow` that does not need to exist is just a way to discover in six months
 * that it does.
 *
 * The sitemap is declared here as well as being at its conventional path, which
 * is what gets it picked up by crawlers that do not guess.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
