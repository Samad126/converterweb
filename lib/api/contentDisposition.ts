/**
 * `Content-Disposition` in both of its RFC 6266 forms.
 *
 * The server sends both spellings of the filename on purpose:
 *
 *     attachment; filename="Quarterly report.pdf"; filename*=UTF-8''Quarterly%20report.pdf
 *
 * The quoted ASCII `filename` is what older clients read; `filename*` carries
 * the same name percent-encoded as UTF-8, which is the only way a non-ASCII
 * name survives the trip. We prefer `filename*` whenever it is present, and
 * fall back to the ASCII form when it is not.
 *
 * One trap in particular: the extension on the download is decided by the
 * target's `multiple` flag and `mediaType`, never by the extension in this
 * header. An image target answers with a ZIP whose header still carries the
 * image's own extension, and saving an archive under an image extension hands
 * the user a file their image viewer refuses to open.
 */
import { stripExtension } from "../format";

/** `filename*=...` — checked first, so it always wins over `filename=...`. */
const FILENAME_STAR = /(?:^|;)\s*filename\*\s*=\s*("(?:[^"\\]|\\.)*"|[^;]*)/i;

/** `filename=...` — the ASCII fallback. */
const FILENAME_PLAIN = /(?:^|;)\s*filename\s*=\s*("(?:[^"\\]|\\.)*"|[^;]*)/i;

/** Longest name we will offer to save. Well past any real document name. */
const MAX_NAME_LENGTH = 180;

/**
 * The filename parameter of a `Content-Disposition` header, decoded, or `null`
 * when the header carries nothing usable.
 *
 * Returned unsanitised — `sanitizeFilename` is the gate, and callers that
 * display or save a name must pass it through.
 */
export function parseContentDispositionFilename(
  header: string | null | undefined,
): string | null {
  if (!header) return null;

  const starred = FILENAME_STAR.exec(header);
  if (starred) {
    const decoded = decodeExtendedValue(unquote(starred[1] ?? ""));
    if (decoded !== null && decoded.trim() !== "") return decoded;
  }

  const plain = FILENAME_PLAIN.exec(header);
  if (plain) {
    const value = unquote(plain[1] ?? "");
    if (value.trim() !== "") return value;
  }

  return null;
}

/**
 * `UTF-8''Quarterly%20report.pdf` → `Quarterly report.pdf`.
 *
 * The grammar is `charset "'" [language] "'" value-chars`, so the charset and
 * any language tag are two apostrophe-delimited fields in front of the part we
 * actually want. A value with fewer than two apostrophes is not a well-formed
 * ext-value; rather than reject it we treat the whole thing as the name, which
 * is what a server that simply forgot the prefix meant.
 */
function decodeExtendedValue(value: string): string | null {
  const firstQuote = value.indexOf("'");
  if (firstQuote === -1) return value;

  const secondQuote = value.indexOf("'", firstQuote + 1);
  const encoded = secondQuote === -1 ? value.slice(firstQuote + 1) : value.slice(secondQuote + 1);

  try {
    return decodeURIComponent(encoded);
  } catch {
    // Malformed percent-escapes. Showing the raw encoded text is worse than
    // showing the undecoded value, and much worse than failing over to the
    // ASCII parameter or to `converted.<ext>`.
    return encoded === "" ? null : encoded;
  }
}

/** Strip the surrounding quotes of a quoted-string and undo its escapes. */
function unquote(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('"') || !trimmed.endsWith('"') || trimmed.length < 2) {
    return trimmed;
  }
  return trimmed.slice(1, -1).replace(/\\(.)/g, "$1");
}

/**
 * Make a server-supplied name safe to display and to save.
 *
 * A header value is attacker-influenced in the general case and path-shaped in
 * the accidental case, so this takes the last path segment, drops control
 * characters and bidi overrides, and refuses the names that mean something to
 * a filesystem rather than to a person. Empty means "nothing usable", and the
 * caller falls back to `converted.<ext>`.
 */
export function sanitizeFilename(name: string): string {
  const segments = name.split(/[\\/]/);
  const lastSegment = segments[segments.length - 1] ?? "";

  const cleaned = lastSegment
    // Control characters, including NUL and the newline a header can smuggle.
    .replace(/[\u0000-\u001f\u007f]/g, "")
    // Bidirectional overrides: a name that renders as something other than what
    // it is, which is how "annexe‮fdp.exe" passes for a PDF.
    .replace(/[‪-‮⁦-⁩]/g, "")
    .trim()
    // Leading dots hide the file and spell "..".
    .replace(/^\.+/, "")
    // Windows silently drops trailing dots and spaces, so a name that ends in
    // one is not the name that gets saved.
    .replace(/[.\s]+$/, "");

  return cleaned.slice(0, MAX_NAME_LENGTH);
}

/**
 * The name to save and to display: the server's name with the target's own
 * extension, or `converted.<ext>` when the header had nothing usable in it.
 *
 * `extension` comes from `GET /formats`, adjusted for the archive targets —
 * see `downloadExtension` in `lib/converter/formats.ts`. It is never read from the
 * header.
 */
export function buildDownloadName(
  disposition: string | null | undefined,
  extension: string,
): string {
  const raw = parseContentDispositionFilename(disposition);
  const safe = raw === null ? "" : sanitizeFilename(raw);
  const base = sanitizeFilename(stripExtension(safe));

  return base === "" ? `converted${extension}` : `${base}${extension}`;
}
