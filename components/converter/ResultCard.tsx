"use client";

/**
 * The finished conversion.
 *
 * An inverted block is this design's strongest available signal, so it is spent
 * here — on the state where the person has what they came for. The check glyph
 * and the word "Converted" carry the meaning; the inversion only makes it
 * impossible to miss.
 *
 * The preview is an `<iframe sandbox="">` and nothing else. An empty sandbox
 * means no scripts, no same-origin access, no forms, no top-level navigation:
 * the converted document is drawn, not run. This is the only place a converted
 * file's bytes are ever handed back to a renderer, and the attribute is the
 * whole reason that is safe.
 */
import { useEffect, useRef } from "react";

import type { ConversionResult } from "@/lib/converter/useConverter";
import { formatBytes, formatDuration } from "@/lib/format";

import { CheckIcon, DownloadIcon, EyeIcon } from "../ui/Icons";

export interface ResultCardProps {
  result: ConversionResult;
  /** The preview document, once it has been asked for. */
  previewText: string | null;
  isLoadingPreview: boolean;
  onLoadPreview: () => void;
  onReset: () => void;
}

export function ResultCard({
  result,
  previewText,
  isLoadingPreview,
  onLoadPreview,
  onReset,
}: ResultCardProps): React.ReactElement {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section className="panel-strong" aria-labelledby="result-heading">
      <span className="chip-inverse">
        <CheckIcon size={12} />
        <span className="eyebrow">Converted</span>
      </span>

      <h2 id="result-heading" ref={headingRef} tabIndex={-1} className="file-name text-xl font-bold tracking-tight mt-4">
        <span className="sr-only">Converted: </span>
        {result.filename}
      </h2>

      <p className="meta mt-2">
        {formatBytes(result.byteSize)} · {result.targetLabel} ·{" "}
        {formatDuration(result.elapsedMs)}
      </p>

      {result.isArchive ? (
        <p className="meta mt-3">
          A ZIP archive containing one image per page.
        </p>
      ) : null}

      <a
        className="btn btn-inverse mt-5"
        href={result.downloadUrl}
        download={result.filename}
      >
        <DownloadIcon size={18} />
        Download
      </a>

      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        {result.isText ? (
          <button
            type="button"
            className="btn-quiet"
            onClick={onLoadPreview}
            disabled={isLoadingPreview}
          >
            <EyeIcon size={14} />
            {isLoadingPreview ? "Loading preview" : "Preview"}
          </button>
        ) : null}

        <button type="button" className="btn-quiet" onClick={onReset}>
          Convert another file
        </button>
      </div>

      {previewText !== null ? (
        <div className="mt-4">
          {/* sandbox="" is not a default to be tuned. Scripts, same-origin
              access, forms and navigation stay off. */}
          <iframe
            className="preview-frame"
            sandbox=""
            srcDoc={previewText}
            title={`Preview of ${result.filename}`}
          />
          <p className="meta mt-2">
            Shown in a sandboxed frame: scripts in the converted file do not run.
          </p>
        </div>
      ) : null}
    </section>
  );
}
