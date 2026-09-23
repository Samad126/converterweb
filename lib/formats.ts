/**
 * Everything we know about the conversion matrix, derived from `GET /formats`.
 *
 * There is no table in this file and there must never be one. The service
 * decides which sources it accepts, which targets each source can reach, and
 * what each target is called; this module only reads those answers and turns
 * them into the questions the UI has to ask ("is this target reachable from the
 * file the user picked?"). A hard-coded matrix here would silently disagree
 * with the server the first time the server grows, which is exactly what
 * `GET /formats` exists to prevent.
 *
 * The one thing this file *does* know is a media type literal, `application/zip`
 * for the archive targets. That is a fact about the response in the contract
 * (`components/responses/ConvertedToTarget`), not a fact about the matrix, and
 * it is marked as such in `lib/constants.ts`.
 */
import { ARCHIVE_EXTENSION, ARCHIVE_MEDIA_TYPE, MAX_UPLOAD_BYTES } from "./constants";
import type { FormatsResponse, SourceFormat, TargetFormat, TargetId } from "./contract";
import { extensionOf, formatBytes } from "./format";

/**
 * A media type reduced to what can be compared: lower case, parameters
 * (`; charset=utf-8`) dropped, whitespace trimmed.
 *
 * The contract requires the comparison to ignore the charset, and it has to
 * work in both directions: `GET /formats` declares some targets as
 * `text/plain; charset=utf-8`, while `application/pdf` arrives bare.
 */
export function normalizeMediaType(value: string | null | undefined): string {
  if (!value) return "";
  return (value.split(";")[0] ?? "").trim().toLowerCase();
}

/**
 * The `Content-Type` a successful response for this target must carry.
 *
 * This is the target's declared media type, except for the archive targets: a
 * target with `multiple: true` always answers `application/zip`, whatever its
 * own `mediaType` says, because there is one image per page and a ZIP is the
 * only way to put several files in one response.
 */
export function expectedMediaType(target: TargetFormat): string {
  return target.multiple ? ARCHIVE_MEDIA_TYPE : normalizeMediaType(target.mediaType);
}

/**
 * The extension the download is saved under.
 *
 * Never taken from `Content-Disposition`: an archive target's header still
 * carries the image's own extension, and saving a ZIP under that produces a
 * file no image viewer will open.
 */
export function downloadExtension(target: TargetFormat): string {
  return target.multiple ? ARCHIVE_EXTENSION : target.extension;
}

/** The target with this id, or `null` if the server does not produce it. */
export function findTarget(formats: FormatsResponse, id: TargetId): TargetFormat | null {
  return formats.targets.find((target) => target.id === id) ?? null;
}

/**
 * The source entry for an uploaded file, matched on the filename extension.
 *
 * Matched case-insensitively, because the extension survives to the wire in
 * whatever case the user's file happened to have, and `SOFFICE` reads it off
 * the disk. A file with no extension, or one the service does not accept, has
 * no source entry — which is the client-side rejection path, not an error.
 */
export function findSource(formats: FormatsResponse, filename: string): SourceFormat | null {
  return findSourceByExtension(formats, extensionOf(filename));
}

/** The source entry for a filename extension. Case-insensitive. */
export function findSourceByExtension(
  formats: FormatsResponse,
  extension: string,
): SourceFormat | null {
  const wanted = extension.toLowerCase();
  if (wanted === "") return null;

  return formats.sources.find((source) => source.extension.toLowerCase() === wanted) ?? null;
}

/**
 * Every extension the service accepts, in the order `GET /formats` lists them.
 *
 * Used for the `accept` attribute and for the sentence shown when a dropped
 * file is not one of them.
 */
export function acceptedExtensions(formats: FormatsResponse): string[] {
  return formats.sources.map((source) => source.extension);
}

/**
 * The `accept` attribute for the file input, narrowed to a subset of the
 * matrix's extensions (a conversion page's own accepted list, or the whole
 * matrix's).
 *
 * Extensions decide what the server does with the upload — the import filter
 * is chosen by extension, not by whatever MIME type a browser guessed. But a
 * mobile picker (Android's especially, and cloud-storage sources like Drive
 * within it) filters the file list by MIME type first and can hide everything
 * for an extensions-only `accept`, which looks exactly like "nothing happens"
 * with no error at all. So each matching source's declared `mediaType` rides
 * along as a second, permissive hint; the extension check in
 * `validateCandidate` is still the one thing that actually decides what gets
 * accepted.
 */
export function acceptAttribute(formats: FormatsResponse, extensions: readonly string[]): string {
  const wanted = new Set(extensions.map((extension) => extension.toLowerCase()));
  const mediaTypes = formats.sources
    .filter((source) => wanted.has(source.extension.toLowerCase()))
    .map((source) => source.mediaType);
  return [...extensions, ...mediaTypes].join(",");
}

/** Whether this source can become this target, according to the matrix. */
export function isReachable(source: SourceFormat, targetId: TargetId): boolean {
  return source.targets.includes(targetId);
}

/**
 * The source extensions that can reach a target, in the server's order.
 *
 * This is how a disabled target gets its reason without a hard-coded list: if
 * `GET /formats` says only three sources can produce a spreadsheet, the reason
 * can say so, and it stays true when the server adds a fourth.
 */
export function reachableSourceExtensions(
  formats: FormatsResponse,
  targetId: TargetId,
): string[] {
  return formats.sources
    .filter((source) => isReachable(source, targetId))
    .map((source) => source.extension);
}

/**
 * Why a target that exists cannot be produced from the chosen source.
 *
 * Read entirely out of `GET /formats`, so the sentence and the disabled chip
 * can never drift apart.
 */
export function unreachableReason(formats: FormatsResponse, targetId: TargetId): string {
  const extensions = reachableSourceExtensions(formats, targetId);
  if (extensions.length === 0) {
    return "This converter cannot produce it from any file type.";
  }
  return `Only from ${formatList(extensions)}.`;
}

/**
 * A target with no source chosen yet.
 *
 * Not an error and not a rejection — the picker is on screen from the first
 * paint so that the layout does not move when a file is dropped into it.
 */
export const NO_SOURCE_REASON = "Choose a file first.";

/** Whether a target produces text we can show in a sandboxed preview. */
export function isTextTarget(target: TargetFormat): boolean {
  return normalizeMediaType(target.mediaType).startsWith("text/");
}

/** "a, b and c" — an Oxford-comma-free list for a sentence read once. */
export function formatList(items: readonly string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0] ?? "";
  const head = items.slice(0, -1).join(", ");
  const tail = items[items.length - 1] ?? "";
  return `${head} and ${tail}`;
}

/**
 * The sentence shown when client-side validation refuses a file.
 *
 * The accepted list comes from the matrix, so this stays true when the service
 * learns a new extension. The filename is included because the person dropped
 * something and is owed the name of what was refused.
 *
 * `accepted` overrides that list for the pages that only take part of it — a
 * `/word_to_pdf` page accepts the three Word extensions and nothing else, and
 * replying to somebody who dropped a PNG there with the service's full list is a
 * sentence about a different page.
 */
export function unsupportedFileMessage(
  formats: FormatsResponse,
  filename: string,
  accepted: readonly string[] = acceptedExtensions(formats),
): string {
  const extension = extensionOf(filename);
  const described = extension === "" ? "has no file extension" : `is a ${extension} file`;
  return `${filename} ${described}, which this converter does not accept. Accepted: ${accepted.join(", ")}.`;
}

/**
 * The sentence shown when a file is over the contract's 100 MiB limit.
 *
 * Both numbers are shown, because "too large" without the actual size leaves
 * the person guessing which of their files would fit.
 */
export function oversizedFileMessage(filename: string, bytes: number): string {
  return `${filename} is ${formatBytes(bytes)}. The largest file this converter accepts is ${formatBytes(MAX_UPLOAD_BYTES)}.`;
}
