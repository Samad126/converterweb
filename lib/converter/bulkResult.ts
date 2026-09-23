import { buildDownloadName } from "../api/contentDisposition";
import type { BulkConversionResult, BulkFileOutcome } from "./converterTypes";
import type { TargetFormat } from "../api/contract";
import { expectedMediaType } from "./formats";
import { findEntryForFile, parseConvertZip, type ZipErrorEntry } from "./zip";

/**
 * Build a `BulkConversionResult` out of the raw ZIP the server sent back, by
 * unzipping it client-side and attributing every entry (and every
 * `errors.json` line) to the input file it came from.
 */
export async function buildBulkResult(
  inputFiles: readonly File[],
  target: TargetFormat,
  zipBlob: Blob,
  disposition: string | null,
  elapsedMs: number,
): Promise<BulkConversionResult> {
  const parsed = await parseConvertZip(zipBlob);
  const errorsByFile = new Map<string, ZipErrorEntry>();
  for (const entry of parsed.errors) errorsByFile.set(entry.file, entry);

  const outcomes: BulkFileOutcome[] = inputFiles.map((input, index) => {
    const failure = errorsByFile.get(input.name);
    if (failure) {
      return {
        inputName: input.name,
        success: false,
        entryName: null,
        byteSize: null,
        downloadUrl: null,
        errorMessage: failure.message,
      };
    }

    const entryName = findEntryForFile(parsed.entryNames, input.name, index);
    const bytes = entryName ? parsed.entries.get(entryName) : undefined;

    if (!entryName || !bytes) {
      // Neither an entry nor an `errors.json` line names this file: the
      // archive could not be attributed to it. Reported as a failure rather
      // than silently dropped, so the person is not left wondering.
      return {
        inputName: input.name,
        success: false,
        entryName: null,
        byteSize: null,
        downloadUrl: null,
        errorMessage: "Not found in the converted archive.",
      };
    }

    // A folder entry (an image target's per-page result) has no single blob
    // of its own — its bytes stay inside the overall archive download.
    const isFolderEntry = entryName.includes("/");
    const downloadUrl = isFolderEntry
      ? null
      : URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: expectedMediaType(target) }));

    return {
      inputName: input.name,
      success: true,
      entryName,
      byteSize: bytes.byteLength,
      downloadUrl,
      errorMessage: null,
    };
  });

  const zipDownloadUrl = URL.createObjectURL(zipBlob);

  return {
    targetId: target.id,
    targetLabel: target.label,
    elapsedMs,
    outcomes,
    zipFilename: buildDownloadName(disposition, ".zip"),
    zipByteSize: zipBlob.size,
    zipDownloadUrl,
    zipBlob,
  };
}

/** Every object URL a bulk result created, for cleanup. */
export function collectBulkUrls(result: BulkConversionResult): string[] {
  const urls = result.outcomes
    .map((outcome) => outcome.downloadUrl)
    .filter((url): url is string => url !== null);
  urls.push(result.zipDownloadUrl);
  return urls;
}
