"use client";

/**
 * The finished bulk conversion — two or more files, one archive back.
 *
 * The server's response is a single ZIP, and downloading it whole is always
 * offered: it is the one thing guaranteed to contain everything that
 * succeeded, however the mix of successes and failures turned out. Alongside
 * it, every input file gets its own line naming what happened to it — a
 * direct download for a file whose result is a single entry in the archive,
 * or the server's own sentence for one that failed. That per-file detail is
 * read out of the ZIP and its `errors.json` in `lib/converter/useConverter.ts`, not
 * fetched again: the archive already is the whole answer.
 */
import type { BulkConversionResult } from "@/lib/converter/useConverter";
import { formatBytes, formatDuration } from "@/lib/format";

import { CheckIcon, DownloadIcon } from "../ui/Icons";

export interface BulkResultCardProps {
  result: BulkConversionResult;
  onReset: () => void;
}

export function BulkResultCard({ result, onReset }: BulkResultCardProps): React.ReactElement {
  const succeeded = result.outcomes.filter((outcome) => outcome.success).length;
  const failed = result.outcomes.length - succeeded;

  return (
    <section className="panel-strong" aria-labelledby="bulk-result-heading">
      <span className="chip-inverse">
        <CheckIcon size={12} />
        <span className="eyebrow">Converted</span>
      </span>

      <h2 id="bulk-result-heading" className="file-name text-xl font-bold tracking-tight mt-4">
        {result.zipFilename}
      </h2>

      <p className="meta mt-2">
        {succeeded} of {result.outcomes.length} file{result.outcomes.length === 1 ? "" : "s"}{" "}
        converted to {result.targetLabel} · {formatBytes(result.zipByteSize)} ·{" "}
        {formatDuration(result.elapsedMs)}
      </p>

      {failed > 0 ? (
        <p className="notice mt-1">
          {failed} file{failed === 1 ? "" : "s"} could not be converted — see below.
        </p>
      ) : null}

      <a
        className="btn btn-inverse mt-5"
        href={result.zipDownloadUrl}
        download={result.zipFilename}
      >
        <DownloadIcon size={18} />
        Download all as ZIP
      </a>

      <ol className="mt-5 flex flex-col gap-2" aria-label="Every file's outcome">
        {result.outcomes.map((outcome, index) => (
          <li key={`${outcome.inputName}-${index}`} className="chosen-file">
            <span className="file-name">
              {outcome.success ? (
                <CheckIcon size={12} className="inline-block mr-1" />
              ) : null}
              {outcome.inputName}
            </span>
            {outcome.success ? (
              <>
                {outcome.byteSize !== null ? (
                  <span className="meta">{formatBytes(outcome.byteSize)}</span>
                ) : null}
                {outcome.downloadUrl !== null ? (
                  <a
                    className="btn-quiet"
                    href={outcome.downloadUrl}
                    download={entryDownloadName(outcome.entryName, outcome.inputName)}
                  >
                    <DownloadIcon size={14} />
                    Download
                  </a>
                ) : (
                  <span className="meta">Included in the ZIP</span>
                )}
              </>
            ) : (
              <span className="notice">{outcome.errorMessage}</span>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-3">
        <button type="button" className="btn-quiet" onClick={onReset}>
          Convert more files
        </button>
      </div>
    </section>
  );
}

/** The name a per-file download is saved under: the archive entry's own name. */
function entryDownloadName(entryName: string | null, fallback: string): string {
  if (entryName === null) return fallback;
  const segments = entryName.split("/");
  return segments[segments.length - 1] || fallback;
}
