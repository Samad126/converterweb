/**
 * The one normalization every comparison in this module goes through.
 *
 * Case-insensitive and diacritic-insensitive so that "café" and "cafe" agree,
 * `NFD` + combining-mark strip being the standard way to do the latter without
 * a table of substitutions.
 */
export function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * The query, normalized and with a leading dot dropped.
 *
 * `" .pdf "` and `"pdf"` are the same question — a person typing an extension
 * either does or doesn't lead with the dot, and the index's own extensions are
 * compared against this with their own dot stripped too (see `rank.ts`).
 */
export function normalizeQuery(raw: string): string {
  const normalized = normalizeText(raw);
  return normalized.startsWith(".") ? normalized.slice(1) : normalized;
}

/** An extension with its leading dot removed, for comparison against a query. */
export function bareExtension(extension: string): string {
  return normalizeText(extension).replace(/^\./, "");
}
