/**
 * Reading the one kind of ZIP this app ever receives: the response to a
 * `/convert/{target}` request with two or more files, described in
 * `components/responses/ConvertedToTarget`.
 *
 * The archive holds one entry per input file, named
 * `<NN>-<original name>.<target extension>` (or a `<NN>-<original name>/`
 * folder for an image target), in upload order. A file that failed to
 * convert contributes no entry of its own; instead, if any file in the batch
 * failed, the archive additionally holds `errors.json` at its root — an array
 * of `{ file, code, message }`, in upload order, naming every failure. `file`
 * is the *original* filename, not the numbered entry name.
 *
 * `unzipSync` from `fflate` is synchronous and works entirely off an
 * in-memory `Uint8Array`, which is exactly the shape a `Blob` already read
 * into memory takes — no worker, no streaming, nothing this app does not
 * already do for a single-file response.
 */
import { unzipSync, type Unzipped } from "fflate";

export interface ZipErrorEntry {
  file: string;
  code: string | null;
  message: string;
}

export interface ParsedZip {
  /** Every entry's raw path, `errors.json` included, in archive order. */
  entryNames: string[];
  /** `path → bytes`, for every entry except `errors.json`. */
  entries: Map<string, Uint8Array>;
  /** Parsed out of `errors.json`, or empty when the archive has none. */
  errors: ZipErrorEntry[];
}

const ERRORS_FILENAME = "errors.json";

/** Unzip a blob's bytes and split `errors.json` out from the rest. */
export async function parseConvertZip(blob: Blob): Promise<ParsedZip> {
  const buffer = new Uint8Array(await blob.arrayBuffer());

  let unzipped: Unzipped;
  try {
    unzipped = unzipSync(buffer);
  } catch {
    // Not a well-formed ZIP at all — nothing this parser can do with it. The
    // caller treats an empty result as "nothing could be attributed to any
    // file" and falls back to offering the archive as a whole.
    return { entryNames: [], entries: new Map(), errors: [] };
  }

  const entryNames = Object.keys(unzipped);
  const entries = new Map<string, Uint8Array>();
  let errors: ZipErrorEntry[] = [];

  for (const name of entryNames) {
    if (name === ERRORS_FILENAME) {
      errors = parseErrorsJson(unzipped[name]);
      continue;
    }
    // A directory entry (an image target's per-file folder) has no bytes of
    // its own worth keeping as a "file".
    if (name.endsWith("/")) continue;
    const bytes = unzipped[name];
    if (bytes) entries.set(name, bytes);
  }

  return { entryNames, entries, errors };
}

function parseErrorsJson(bytes: Uint8Array | undefined): ZipErrorEntry[] {
  if (!bytes) return [];
  try {
    const text = new TextDecoder().decode(bytes);
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item): ZipErrorEntry | null => {
        if (typeof item !== "object" || item === null) return null;
        const { file, code, message } = item as {
          file?: unknown;
          code?: unknown;
          message?: unknown;
        };
        if (typeof file !== "string" || typeof message !== "string") return null;
        return { file, code: typeof code === "string" ? code : null, message };
      })
      .filter((item): item is ZipErrorEntry => item !== null);
  } catch {
    return [];
  }
}

/**
 * The entry (if any) that belongs to an original filename.
 *
 * Entries are named `<NN>-<original name>.<ext>` or `<NN>-<original name>/…`
 * for an image target's folder — the number and a hyphen are prepended to the
 * *stem* only, so we look for the first top-level path segment that ends with
 * `-<stem>` (folder form) or find the single file whose name, once the
 * leading `NN-` is stripped and its extension replaced, matches the stem.
 * Rather than reconstruct the server's exact naming rule, we match by the
 * stripped numeric prefix and the original stem — tolerant of the extension
 * changing, which it always does.
 */
export function findEntryForFile(
  entryNames: readonly string[],
  originalName: string,
  index: number,
): string | null {
  const stem = stripExtension(originalName);
  const prefix = `${String(index + 1).padStart(2, "0")}-`;

  // Prefer an exact numbered match, in upload order.
  const numbered = entryNames.find((name) => {
    const top = name.split("/")[0] ?? name;
    return top.startsWith(prefix) && stripExtension(top.slice(prefix.length)) === stem;
  });
  if (numbered) return numbered;

  // Fall back to any entry whose stem (ignoring a numeric prefix) matches.
  const loose = entryNames.find((name) => {
    const top = name.split("/")[0] ?? name;
    const withoutPrefix = top.replace(/^\d+-/, "");
    return stripExtension(withoutPrefix) === stem;
  });
  return loose ?? null;
}

function stripExtension(name: string): string {
  const index = name.lastIndexOf(".");
  return index <= 0 ? name : name.slice(0, index);
}
