"use client";

/**
 * Renders one page of a user-supplied PDF to a `<canvas>` via `pdf.js`, with
 * a same-sized absolutely-positioned overlay on top where `/pdf/sign`,
 * `/pdf/redact` and `/pdf/edit` place, drag and resize their elements —
 * shared so all three tools convert screen pixels to PDF points the same way
 * (`lib/pdfCoords.ts`, unit-tested on its own).
 *
 * `pdf.js` needs its worker script servable from *somewhere*; this points
 * `GlobalWorkerOptions.workerSrc` at the package's own `.mjs` worker via a
 * `new URL(..., import.meta.url)` reference, which both Webpack and Turbopack
 * resolve into a static asset at build time. No manual copy into `public/`
 * needed.
 */
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

import type { Size } from "@/lib/pdfCoords";

export interface PdfPagePreviewProps {
  file: File | Blob | null;
  /** 1-based. */
  page: number;
  onPageChange: (page: number) => void;
  onPageCount?: (count: number) => void;
  /** Rendered at this many canvas pixels per PDF point. Defaults to 1.4. */
  renderScale?: number;
  /**
   * The overlay, rendered in an absolutely-positioned box exactly the size
   * of the canvas — so its children can be positioned in the same pixel
   * space the canvas was drawn in.
   */
  overlay?: (canvasSizePx: Size, pageSizePt: Size) => React.ReactNode;
}

export function PdfPagePreview({
  file,
  page,
  onPageChange,
  onPageCount,
  renderScale = 1.4,
  overlay,
}: PdfPagePreviewProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [canvasSizePx, setCanvasSizePx] = useState<Size>({ width: 0, height: 0 });
  const [pageSizePt, setPageSizePt] = useState<Size>({ width: 612, height: 792 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!file) {
        setDoc(null);
        setPageCount(0);
        return;
      }
      setError(null);
      try {
        const pdfjs = await import("pdfjs-dist");
        const workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

        const data = await file.arrayBuffer();
        if (cancelled) return;

        let loaded: PDFDocumentProxy;
        try {
          loaded = await pdfjs.getDocument({ data }).promise;
        } catch (workerError) {
          // A module Worker (what this build's .mjs worker needs) is not
          // universally supported — Samsung Internet in particular has been
          // seen to fail here. Falling back to no worker at all runs pdf.js
          // on the main thread instead, which is slower but works wherever
          // the module worker doesn't.
          console.warn("pdf.js: module worker failed, retrying without one", workerError);
          pdfjs.GlobalWorkerOptions.workerSrc = "";
          loaded = await pdfjs.getDocument({ data }).promise;
        }
        if (cancelled) return;
        setDoc(loaded);
        setPageCount(loaded.numPages);
        onPageCount?.(loaded.numPages);
      } catch (error) {
        if (!cancelled) {
          console.error("pdf.js: could not load PDF for preview", error);
          setError("Could not render a preview of this PDF.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  useEffect(() => {
    if (!doc) return;
    const clampedPage = Math.min(Math.max(page, 1), doc.numPages);
    let cancelled = false;

    void (async () => {
      try {
        const pdfPage = await doc.getPage(clampedPage);
        if (cancelled) return;
        const unscaled = pdfPage.getViewport({ scale: 1 });
        setPageSizePt({ width: unscaled.width, height: unscaled.height });

        const viewport = pdfPage.getViewport({ scale: renderScale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        setCanvasSizePx({ width: viewport.width, height: viewport.height });

        const context = canvas.getContext("2d");
        if (!context) return;
        await pdfPage.render({ canvasContext: context, viewport, canvas }).promise;
      } catch (error) {
        if (!cancelled) {
          console.error("pdf.js: could not render page for preview", error);
          setError("Could not render a preview of this PDF.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [doc, page, renderScale]);

  if (!file) return <p className="meta">Choose a PDF to place elements on it.</p>;
  if (error) return <p className="meta">{error}</p>;

  return (
    <div className="flex flex-col gap-2">
      {pageCount > 1 ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-quiet"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            Previous page
          </button>
          <span className="meta">
            Page {page} of {pageCount}
          </span>
          <button
            type="button"
            className="btn-quiet"
            onClick={() => onPageChange(Math.min(pageCount, page + 1))}
            disabled={page >= pageCount}
          >
            Next page
          </button>
        </div>
      ) : null}

      <div
        data-testid="pdf-page-preview"
        style={{
          position: "relative",
          width: canvasSizePx.width || undefined,
          // A raw-pixel width would overflow a narrow column — `pdf.js`
          // renders at `renderScale` canvas pixels per PDF point, which can
          // be wider than a phone's viewport. `maxWidth` caps the box and
          // `aspectRatio` keeps the height in step, so the whole thing (and
          // the overlay sized to match it below) scales down together
          // instead of clipping or stretching.
          maxWidth: "100%",
          aspectRatio: canvasSizePx.width > 0 ? `${canvasSizePx.width} / ${canvasSizePx.height}` : undefined,
        }}
      >
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
        {canvasSizePx.width > 0 ? (
          <div style={{ position: "absolute", inset: 0 }}>{overlay?.(canvasSizePx, pageSizePt)}</div>
        ) : null}
      </div>
    </div>
  );
}
