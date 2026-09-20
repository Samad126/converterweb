import { CATALOG, EXTRA_TOOLS } from "@/lib/catalog";
import { AUTHOR, SITE_NAME, absoluteUrl } from "@/lib/site";

/**
 * `llms.txt` — a plain-text index for AI assistants and answer engines,
 * following the community convention (llmstxt.org): a short description of
 * the site followed by a flat list of its pages as Markdown links, so a
 * model can decide what to fetch without rendering JavaScript or guessing at
 * navigation.
 *
 * Generated from the same `CATALOG` the sitemap and the pages themselves are
 * built from, so this can never list a conversion the site does not actually
 * have, or drift from `lib/catalog.ts` as pages are added.
 */
export function GET(): Response {
  const conversionLines = CATALOG.map(
    (entry) => `- [${entry.heading}](${absoluteUrl(`/${entry.slug}`)}): ${entry.description}`,
  ).join("\n");

  const toolLines = EXTRA_TOOLS.map(
    (tool) =>
      `- [${tool.label}](${absoluteUrl(tool.route)}): Accepts ${tool.extensions.join(", ")}.`,
  ).join("\n");

  const body = `# ${SITE_NAME}

> Convert Word, Excel, PowerPoint, ODT, ODS, ODP, CSV, TXT, HTML, RTF, PNG and JPG files to PDF and other formats, free and without an account. Files are uploaded to convert, never stored, and nothing is installed.

Built by ${AUTHOR.name} (${AUTHOR.portfolio}). Source: ${AUTHOR.githubFrontend} (frontend), ${AUTHOR.githubBackend} (backend).

## Conversions

${conversionLines}

## Other tools

${toolLines}

## Pages

- [All conversions](${absoluteUrl("/conversions")}): The full catalog of conversion pages, grouped by format.
- [About](${absoluteUrl("/about")}): Who built this and how it works.
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
