/**
 * Matching and ranking — deterministic, so the same query always produces the
 * same order and results never shuffle between keystrokes that don't change
 * the winning set.
 *
 * Rank order, best first: exact target/tool id, exact extension, prefix,
 * word-boundary substring, plain substring, subsequence fuzzy. Within a rank,
 * results are sorted alphabetically by label so ties are stable rather than
 * left in whatever order the index happens to hold them.
 */
import { bareExtension, normalizeQuery, normalizeText } from "./normalize";
import type { MatchRank, SearchItem, SearchResult } from "./types";

const RANK_WEIGHT: Readonly<Record<MatchRank, number>> = {
  "exact-id": 0,
  "exact-extension": 1,
  prefix: 2,
  "word-boundary": 3,
  substring: 4,
  subsequence: 5,
};

/** `true` if every character of `needle` appears in `haystack`, in order. */
function isSubsequence(needle: string, haystack: string): boolean {
  let i = 0;
  for (let j = 0; j < haystack.length && i < needle.length; j += 1) {
    if (haystack[j] === needle[i]) i += 1;
  }
  return i === needle.length;
}

/**
 * Whether `q` occurs in `text` starting right at a word boundary — the start
 * of the string, or just after a character that isn't a letter or digit.
 * Unlike `prefix`, `q` doesn't have to start the whole string: "to pdf" hits
 * this tier inside "word to pdf" because it starts right after a space.
 */
function matchesWordBoundary(q: string, text: string): boolean {
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}`).test(text);
}

/** The best (lowest-weight) way `query` matches this one item, or `null`. */
export function matchItem(query: string, item: SearchItem): MatchRank | null {
  const q = normalizeQuery(query);
  if (q === "") return null;

  const idCandidates = [item.targetId, item.id.split(":")[1]]
    .filter((value): value is string => Boolean(value))
    .map(normalizeText);
  if (idCandidates.includes(q)) return "exact-id";

  const extensionCandidates = item.extensions.map(bareExtension);
  if (extensionCandidates.includes(q)) return "exact-extension";

  const label = normalizeText(item.label);
  const synonyms = item.synonyms.map(normalizeText);
  const textFields = [label, ...synonyms, ...extensionCandidates, ...idCandidates];

  if (textFields.some((field) => field.startsWith(q))) return "prefix";
  if (matchesWordBoundary(q, label) || synonyms.some((s) => matchesWordBoundary(q, s))) {
    return "word-boundary";
  }
  if (textFields.some((field) => field.includes(q))) return "substring";
  if (isSubsequence(q, label)) return "subsequence";

  return null;
}

/** Alphabetical by label, then by id — the stable tie-break for equal rank. */
function compareResults(a: SearchResult, b: SearchResult): number {
  const weightDiff = RANK_WEIGHT[a.rank] - RANK_WEIGHT[b.rank];
  if (weightDiff !== 0) return weightDiff;
  const labelDiff = a.item.label.localeCompare(b.item.label);
  if (labelDiff !== 0) return labelDiff;
  return a.item.id.localeCompare(b.item.id);
}

/**
 * Every item that matches `query`, best match first, ties broken
 * alphabetically. An empty (or whitespace-only) query matches nothing — the
 * empty-query state is the caller's to render, not this function's to guess.
 */
export function searchItems(items: readonly SearchItem[], query: string): SearchResult[] {
  const results: SearchResult[] = [];
  for (const item of items) {
    const rank = matchItem(query, item);
    if (rank) results.push({ item, rank });
  }
  return results.sort(compareResults);
}
