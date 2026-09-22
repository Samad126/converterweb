/**
 * Turns the live catalog and the static tool registries into one flat,
 * searchable array. Called once per `GET /formats` response, never per
 * keystroke — `rank.ts` does the per-keystroke work, and it is pure and local.
 *
 * Three sources, each already the single place its own facts live:
 *
 *   - `lib/catalog.ts` (`CATALOG`) — the 36 `{source}_to_{target}` pages.
 *     Every extension and target id here is checked against `GET /formats` by
 *     `tests/catalog.test.tsx`, so re-deriving them from the matrix in this
 *     file would be a second copy of a fact that file already guarantees.
 *   - `lib/pdfTools.ts` (`PDF_TOOLS`) — the `/pdf/*` tools. Filtered to the
 *     ones with a `route`, exactly as the grid that lists them does.
 *   - `EXTRA_TOOLS` in `lib/catalog.ts` — the two `/tools/*` pages that are
 *     neither a catalog pair nor a PDF tool (`extract-tables`,
 *     `psd-to-layers`). Named there, not here, so their extensions live in
 *     the one file `tests/matrix.test.tsx` already exempts as editorial
 *     content, rather than needing a second exemption for a second file.
 *   - `lib/mediaCatalog.ts` (`MEDIA_CATALOG`) — the `/audio/*` and `/video/*`
 *     pairs. These are *not* in `GET /formats`: the document matrix and the
 *     media matrix are separate backend facilities, so this is the one group
 *     whose extensions and media types are read from their own table rather
 *     than the live response.
 *
 * Nothing here claims a capability: a disabled target still gets found by
 * search exactly as it does today, and reachability is still decided, at
 * conversion time, by the picker reading `GET /formats` the way it always has.
 */
import { CATALOG, EXTRA_TOOLS } from "../catalog";
import type { FormatsResponse } from "../contract";
import { findTarget, normalizeMediaType } from "../formats";
import { MEDIA_CATALOG } from "../mediaCatalog";
import { PDF_TOOLS } from "../pdfTools";
import { synonymsFor } from "./aliases";
import type { SearchItem } from "./types";

function lower(values: readonly string[]): string[] {
  return values.map((value) => value.toLowerCase());
}

export function buildSearchIndex(formats: FormatsResponse): SearchItem[] {
  const items: SearchItem[] = [];

  for (const entry of CATALOG) {
    const target = findTarget(formats, entry.target);
    const mime = target ? normalizeMediaType(target.mediaType) : "";
    const extensions = lower([
      ...entry.source.extensions,
      ...(target ? [target.extension] : []),
    ]);

    items.push({
      id: `conversion:${entry.slug}`,
      kind: "conversion",
      label: entry.heading,
      route: `/${entry.slug}`,
      extensions,
      mimeTypes: mime ? [mime] : [],
      synonyms: synonymsFor([entry.source.key, entry.target]),
      targetId: entry.target,
    });
  }

  for (const tool of PDF_TOOLS) {
    if (!tool.route) continue; // named but not yet shipped — never a search hit
    items.push({
      id: `pdf-tool:${tool.id}`,
      kind: "pdf-tool",
      label: tool.label,
      route: tool.route,
      extensions: [".pdf"],
      mimeTypes: [],
      synonyms: synonymsFor([tool.id]),
    });
  }

  for (const tool of EXTRA_TOOLS) {
    items.push({
      id: `tool:${tool.id}`,
      kind: "tool",
      label: tool.label,
      route: tool.route,
      extensions: lower(tool.extensions),
      mimeTypes: [],
      synonyms: synonymsFor([tool.id]),
    });
  }

  for (const entry of MEDIA_CATALOG) {
    items.push({
      id: `media:${entry.kind}:${entry.slug}`,
      kind: "media",
      label: entry.heading,
      route: entry.route,
      extensions: lower([entry.source.extension, entry.target.extension]),
      mimeTypes: [normalizeMediaType(entry.target.mediaType)],
      synonyms: synonymsFor([entry.source.id, entry.target.id, entry.kind]),
    });
  }

  return items;
}
