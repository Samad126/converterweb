/**
 * Presentation helpers: bytes and durations, and nothing else.
 *
 * There is no colour here and no pluralisation library. Both are four lines.
 */

const KIB = 1024;
const MIB = 1024 * 1024;

/**
 * Human-readable size, in the same units the contract uses for its own limit
 * ("25 MB"), so that a rejected file and the sentence explaining the limit
 * agree with each other.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < KIB) return `${bytes} B`;

  if (bytes < MIB) {
    const kib = bytes / KIB;
    return `${kib < 10 ? trim(kib, 1) : String(Math.round(kib))} KB`;
  }

  const mib = bytes / MIB;
  return `${mib < 10 ? trim(mib, 1) : String(Math.round(mib))} MB`;
}

/** Drop a trailing ".0" so "2.0 MB" reads as "2 MB". */
function trim(value: number, digits: number): string {
  const fixed = value.toFixed(digits);
  return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
}

/**
 * Elapsed time, for both the running timer and the finished result.
 *
 * Tenths below a minute, because a running timer that does not visibly move
 * looks like a hung page; whole seconds above it, because a long conversion is
 * past the point where tenths mean anything.
 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";

  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(1)} s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes} m ${String(seconds).padStart(2, "0")} s`;
}

/** Countdown for the `429` cooldown: whole seconds, never zero or negative. */
export function formatCountdown(ms: number): string {
  return `${Math.max(0, Math.ceil(ms / 1000))} s`;
}

/**
 * The last dot-extension of a filename, lower-cased, including the dot.
 *
 * Returns an empty string when there is no usable extension — a leading dot
 * alone (a dotfile) does not count.
 */
export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0) return "";
  return filename.slice(dot).toLowerCase();
}

/** The filename without its extension, for building the download name. */
export function stripExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0) return filename;
  return filename.slice(0, dot);
}
