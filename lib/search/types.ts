/**
 * The shape of one searchable thing — a conversion page or a standalone tool.
 *
 * Nothing here is fetched from the network at search time: `buildSearchIndex`
 * (see `buildIndex.ts`) does the one-time work of reading `GET /formats` and
 * the static tool registries, and everything after that is a pure, local,
 * synchronous filter over this array.
 */
export type SearchItemKind = "conversion" | "pdf-tool" | "tool";

export interface SearchItem {
  /** Stable, unique across the whole index — `"conversion:word_to_pdf"`. */
  id: string;
  kind: SearchItemKind;
  /** What a person reads: `"Word to PDF"`, `"Merge"`. */
  label: string;
  /** Where selecting this item goes. */
  route: string;
  /** Lower-cased, dot-prefixed extensions, read from the live matrix. */
  extensions: readonly string[];
  /** Normalized media types this item's output declares, if any. */
  mimeTypes: readonly string[];
  /** Extra words a person might type that do not otherwise appear above. */
  synonyms: readonly string[];
  /** The `/convert/{target}` id, for conversion items only. */
  targetId?: string;
}

/** How an item matched a query — also the ranking order, best first. */
export type MatchRank =
  | "exact-id"
  | "exact-extension"
  | "prefix"
  | "word-boundary"
  | "substring"
  | "subsequence";

export interface SearchResult {
  item: SearchItem;
  rank: MatchRank;
}
