/**
 * The shapes `useConverter` speaks in: phases, results and the hook's own
 * interface. Split out so the hook file holds behaviour only; everything is
 * re-exported from `useConverter` so existing imports keep working.
 */
import type { FormatsResponse, SourceFormat, TargetId } from "../api/contract";
import type { Failure } from "../api/errors";

export type HealthState = "checking" | "ready" | "unavailable";

export type Phase =
  | { name: "ready" }
  | {
      name: "converting";
      stage: "uploading" | "converting";
      loaded: number;
      /** `null` when the browser cannot compute a total: the phase is indeterminate. */
      total: number | null;
    }
  | { name: "done"; result: ConversionResult }
  | { name: "done-bulk"; result: BulkConversionResult }
  | { name: "failed"; failure: Failure };

export interface ConversionResult {
  /** What the file is called on screen and on disk. Never a server path. */
  filename: string;
  byteSize: number;
  targetId: TargetId;
  targetLabel: string;
  /** True for an image target: the response is a ZIP of one image per page. */
  isArchive: boolean;
  /** True when the target's own media type is text, so a preview is possible. */
  isText: boolean;
  /** True for the `html` target, whose preview is inserted as markup. */
  isHtml: boolean;
  elapsedMs: number;
  downloadUrl: string;
  /** Kept so the preview can be built on demand instead of on every success. */
  blob: Blob;
}

/**
 * One input file's outcome inside a bulk (2+ file) conversion.
 *
 * The server's response is always one ZIP holding one entry per input file,
 * plus an `errors.json` naming any per-file failure — see
 * `components/responses/ConvertedToTarget`. This is that same information,
 * attributed back to the file it came from and ready to render.
 */
export interface BulkFileOutcome {
  /** The name the file was uploaded under. */
  inputName: string;
  success: boolean;
  /** The path of this file's entry inside the archive, when it succeeded. */
  entryName: string | null;
  byteSize: number | null;
  /**
   * A per-file download, when the entry is a single file rather than a folder
   * (an image target's multi-page result stays inside the overall archive
   * only — see `zipDownloadUrl` on `BulkConversionResult`).
   */
  downloadUrl: string | null;
  /** The server's own sentence, from this file's `errors.json` entry. */
  errorMessage: string | null;
}

export interface BulkConversionResult {
  targetId: TargetId;
  targetLabel: string;
  elapsedMs: number;
  /** Every input file's outcome, in upload order. */
  outcomes: BulkFileOutcome[];
  /** The archive as a whole — always offered, whatever the mix of outcomes. */
  zipFilename: string;
  zipByteSize: number;
  zipDownloadUrl: string;
  zipBlob: Blob;
}

export interface Converter {
  formats: FormatsResponse | null;
  formatsFailure: Failure | null;
  isLoadingFormats: boolean;
  reloadFormats: () => void;

  health: HealthState;
  healthFailure: Failure | null;
  recheckHealth: () => void;

  /** The chosen file, when exactly one is chosen. `null` in bulk mode. */
  file: File | null;
  /** Every chosen file, in the order they were added. `[file]` in single mode. */
  files: readonly File[];
  /** One rejection sentence per file `addFiles` refused to add, most recent last. */
  fileErrors: readonly string[];
  source: SourceFormat | null;
  targetId: TargetId | null;
  phase: Phase;

  elapsedMs: number;
  cooldownRemainingMs: number;
  canConvert: boolean;

  /**
   * The format this instance is fixed to, or `null` when the person chooses.
   *
   * The panel reads this to decide whether to render the format picker at all.
   */
  lockedTargetId: TargetId | null;
  /** The extensions this instance accepts — the whole matrix, unless narrowed. */
  acceptedExtensions: readonly string[];
  /**
   * The `accept` attribute for the file input: `acceptedExtensions` plus each
   * one's MIME type, so a mobile picker filtering by MIME doesn't hide every
   * file. See `acceptAttribute` in `lib/converter/formats.ts`.
   */
  acceptAttribute: string;
  /** The most files one request may carry, and their combined size limit. */
  maxFiles: number;
  maxTotalBytes: number;

  previewText: string | null;
  isLoadingPreview: boolean;

  /** Replace the whole selection with this one file. The single-file path. */
  selectFile: (file: File) => void;
  /** Add one or more files to the selection, validating each on its own. */
  addFiles: (files: readonly File[]) => void;
  /** Drop one file out of the selection, by its position in `files`. */
  removeFile: (index: number) => void;
  clearFile: () => void;
  selectTarget: (targetId: TargetId) => void;
  start: () => void;
  cancel: () => void;
  /** Clear everything and return to an empty form. */
  reset: () => void;
  /** Keep the chosen file, drop the format — for a `415`, where the source was
   * fine and the target was not. */
  chooseAnotherFormat: () => void;
  loadPreview: () => void;
}

export interface ConverterOptions {
  /**
   * The one format this instance produces.
   *
   * A conversion page passes its target here, and the effect is a *lock*: the
   * picker is not rendered (see `StatusPanel`), `targetId` is always this, and
   * the page cannot be talked into producing anything else. Somebody who wanted
   * a different format is better served by the links to the sibling pages than
   * by a picker that would silently turn this page into a different one.
   *
   * Read once, on the first render.
   */
  lockedTargetId?: TargetId;
  /**
   * Narrow the accepted uploads to these extensions.
   *
   * Also a conversion page's concern: `/word_to_pdf` takes the three Word
   * extensions, and a PNG dropped on it should be refused with a sentence about
   * *this* page rather than quietly converted because the service happens to
   * accept PNGs. `null` means the whole matrix.
   */
  acceptedExtensions?: readonly string[];
}
