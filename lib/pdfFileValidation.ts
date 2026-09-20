/**
 * Client-side file validation for the `/pdf/*` toolkit.
 *
 * `lib/useConverter.ts` validates every file a conversion page is handed
 * before it ever reaches the network — wrong extension, oversized, too many
 * files — and shows the refusal immediately, as a `.notice`. The `/pdf/*`
 * tools had no equivalent: a wrong-type or oversized file just went straight
 * to the server and came back, seconds later, as a full `ErrorNote` failure.
 * Same mistake, two different experiences. This is the `/pdf/*` side of that
 * check, kept separate from `lib/formats.ts` because it has no matrix to
 * consult — every `/pdf/*` tool accepts a fixed, hard-coded set of extensions
 * rather than a reachable subset of one.
 */
import { MAX_UPLOAD_BYTES } from "./constants";
import { extensionOf, formatBytes } from "./format";

/**
 * `null` when `file` is acceptable; otherwise the sentence to show for it,
 * in the same voice `unsupportedFileMessage`/`oversizedFileMessage` use.
 */
export function pdfToolFileError(
  file: File,
  acceptedExtensions: readonly string[],
): string | null {
  const extension = extensionOf(file.name);
  if (!acceptedExtensions.includes(extension)) {
    const described = extension === "" ? "has no file extension" : `is a ${extension} file`;
    return `${file.name} ${described}, which this tool does not accept. Accepted: ${acceptedExtensions.join(", ")}.`;
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return `${file.name} is ${formatBytes(file.size)}. The largest file this tool accepts is ${formatBytes(MAX_UPLOAD_BYTES)}.`;
  }

  return null;
}
