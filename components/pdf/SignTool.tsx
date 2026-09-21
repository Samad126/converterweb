"use client";

/**
 * `/pdf/sign` — stamp a VISUAL-only signature, initials, company stamp,
 * name, date or free text onto exact page positions. Never a cryptographic
 * signature — see the copy below, which says so plainly.
 *
 * Each element's box is placed by dragging on a rendered page preview
 * (`PdfPagePreview`) rather than typed as numbers: press "Place on page",
 * then drag out a box on the page shown. A freshly-added element starts with
 * a default box on page 1 so the tool is usable before any dragging happens;
 * dragging only replaces that default.
 */
import { useState } from "react";

import { PdfPagePreview } from "@/components/PdfPagePreview";
import { PdfToolShell } from "@/components/PdfToolShell";
import { PlacedBox, useNewRectDrag } from "@/components/pdf/placement";
import { pixelRectToPointRect, pointRectToPixelRect, type Rect, type Size } from "@/lib/pdfCoords";
import { usePdfFileTool } from "@/lib/usePdfFileTool";
import type { PdfPart } from "@/lib/pdfApi";

type SignElementType = "signature" | "initials" | "stamp" | "name" | "date" | "text";
type FontStyle = "cursive" | "cursive2" | "plain";

interface SignRow {
  type: SignElementType;
  page: number;
  rect: Rect;
  /** For signature/initials only: whether the source is typed or an image. */
  source: "typed" | "image";
  value: string;
  fontStyle: FontStyle;
  color: string;
  imageIndex: number | null;
}

function emptyRow(page: number): SignRow {
  return {
    type: "text",
    page,
    rect: { x: 72, y: 700, width: 200, height: 24 },
    source: "typed",
    value: "",
    fontStyle: "cursive",
    color: "black",
    imageIndex: null,
  };
}

const REQUIRES_IMAGE_ONLY: readonly SignElementType[] = ["stamp"];
const TYPED_ONLY: readonly SignElementType[] = ["name", "date", "text"];
const EITHER: readonly SignElementType[] = ["signature", "initials"];

export function SignTool(): React.ReactElement {
  const tool = usePdfFileTool("/pdf/sign");
  const [rows, setRows] = useState<SignRow[]>([emptyRow(1)]);
  const [images, setImages] = useState<File[]>([]);
  const [page, setPage] = useState(1);
  const [armedIndex, setArmedIndex] = useState<number | null>(null);

  const updateRow = (index: number, patch: Partial<SignRow>): void => {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  function buildElement(row: SignRow): Record<string, unknown> | null {
    if (row.rect.width <= 0 || row.rect.height <= 0) return null;
    const base = { type: row.type, page: row.page, x: row.rect.x, y: row.rect.y, width: row.rect.width, height: row.rect.height };

    if (REQUIRES_IMAGE_ONLY.includes(row.type)) {
      if (row.imageIndex === null) return null;
      return { ...base, imageIndex: row.imageIndex };
    }
    if (TYPED_ONLY.includes(row.type)) {
      if (row.value.trim() === "") return null;
      return { ...base, value: row.value };
    }
    if (EITHER.includes(row.type)) {
      if (row.source === "typed") {
        if (row.value.trim() === "") return null;
        return { ...base, value: row.value, fontStyle: row.fontStyle, color: row.color };
      }
      if (row.imageIndex === null) return null;
      return { ...base, imageIndex: row.imageIndex };
    }
    return null;
  }

  const elements = rows.map(buildElement);
  const allValid = elements.every((element) => element !== null) && rows.length > 0;

  const onRun = (): void => {
    const parts: PdfPart[] = [
      { name: "elements", value: JSON.stringify(elements.filter((e) => e !== null)) },
      ...images.map((image, index): PdfPart => ({ name: "images", value: image, filename: image.name || `image-${index}` })),
    ];
    tool.run(parts);
  };

  function overlay(canvasSizePx: Size, pageSizePt: Size): React.ReactNode {
    return (
      <SignOverlay
        canvasSizePx={canvasSizePx}
        pageSizePt={pageSizePt}
        page={page}
        rows={rows}
        armedIndex={armedIndex}
        setArmedIndex={setArmedIndex}
        updateRow={updateRow}
      />
    );
  }

  return (
    <PdfToolShell tool={tool} onRun={onRun}>
      <p className="meta">
        This is a visual mark only — the same kind a watermark or page number is — never a
        certificate-based digital signature. Nothing here is legally equivalent to an
        eIDAS/ESIGN/UETA cryptographic signature.
      </p>

      <section className="flex flex-col gap-2">
        <h3 className="font-semibold">Images (for drawn/uploaded signatures, initials or a stamp)</h3>
        <input
          type="file"
          accept="image/png,image/jpeg"
          multiple
          onChange={(event) => {
            const files = event.target.files ? Array.from(event.target.files) : [];
            setImages((current) => [...current, ...files]);
            event.target.value = "";
          }}
        />
        {images.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {images.map((image, index) => (
              <li key={index} className="meta">
                {index}. {image.name}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="meta">PNG or JPG only — SVG is not accepted.</p>
      </section>

      <PdfPagePreview file={tool.file} page={page} onPageChange={setPage} overlay={overlay} />

      {rows.map((row, index) => (
        <fieldset key={index} className="panel flex flex-col gap-2">
          <legend className="font-semibold">Element {index + 1}</legend>

          <label className="flex flex-col gap-1">
            <span>Type</span>
            <select
              className="input"
              value={row.type}
              onChange={(event) =>
                updateRow(index, { type: event.target.value as SignElementType, source: "typed", imageIndex: null })
              }
            >
              <option value="signature">Signature</option>
              <option value="initials">Initials</option>
              <option value="stamp">Company stamp</option>
              <option value="name">Name</option>
              <option value="date">Date</option>
              <option value="text">Text</option>
              <option value="digital" disabled>
                Digital Signature — Coming soon
              </option>
            </select>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <span className="meta">
              Page {row.page} — x={row.rect.x.toFixed(0)}, y={row.rect.y.toFixed(0)}, w={row.rect.width.toFixed(0)}, h=
              {row.rect.height.toFixed(0)} pt
            </span>
            <button
              type="button"
              className="btn-quiet"
              onClick={() => {
                setPage(row.page);
                setArmedIndex(index);
              }}
            >
              {armedIndex === index ? "Drag on the page above…" : "Place on page"}
            </button>
          </div>

          {EITHER.includes(row.type) ? (
            <label className="flex flex-col gap-1">
              <span>Source</span>
              <select className="input" value={row.source} onChange={(e) => updateRow(index, { source: e.target.value as "typed" | "image" })}>
                <option value="typed">Typed</option>
                <option value="image">Drawn or uploaded image</option>
              </select>
            </label>
          ) : null}

          {(TYPED_ONLY.includes(row.type) || (EITHER.includes(row.type) && row.source === "typed")) ? (
            <label className="flex flex-col gap-1">
              <span>Text</span>
              <input type="text" className="input" value={row.value} onChange={(e) => updateRow(index, { value: e.target.value })} />
            </label>
          ) : null}

          {EITHER.includes(row.type) && row.source === "typed" ? (
            <div className="flex gap-3">
              <label className="flex flex-col gap-1">
                <span>Font style</span>
                <select className="input" value={row.fontStyle} onChange={(e) => updateRow(index, { fontStyle: e.target.value as FontStyle })}>
                  <option value="cursive">Cursive</option>
                  <option value="cursive2">Cursive (alt)</option>
                  <option value="plain">Plain</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span>Color</span>
                <input type="text" className="input w-24" value={row.color} onChange={(e) => updateRow(index, { color: e.target.value })} />
              </label>
            </div>
          ) : null}

          {(row.type === "stamp" || (EITHER.includes(row.type) && row.source === "image")) ? (
            <label className="flex flex-col gap-1">
              <span>Image</span>
              <select
                className="input"
                value={row.imageIndex ?? ""}
                onChange={(e) => updateRow(index, { imageIndex: e.target.value === "" ? null : Number(e.target.value) })}
              >
                <option value="" disabled>
                  Choose an uploaded image…
                </option>
                {images.map((image, i) => (
                  <option key={i} value={i}>
                    {i}. {image.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <button type="button" className="btn-quiet self-start" onClick={() => setRows((current) => current.filter((_, i) => i !== index))} disabled={rows.length === 1}>
            Remove element
          </button>
        </fieldset>
      ))}

      <button type="button" className="btn-quiet self-start" onClick={() => setRows((current) => [...current, emptyRow(page)])}>
        Add another element
      </button>

      {!allValid ? <p className="meta">Every element needs a valid page/box and either text or an image, per its type.</p> : null}
    </PdfToolShell>
  );
}

interface SignOverlayProps {
  canvasSizePx: Size;
  pageSizePt: Size;
  page: number;
  rows: SignRow[];
  armedIndex: number | null;
  setArmedIndex: (index: number | null) => void;
  updateRow: (index: number, patch: Partial<SignRow>) => void;
}

function SignOverlay({ canvasSizePx, pageSizePt, page, rows, armedIndex, setArmedIndex, updateRow }: SignOverlayProps): React.ReactElement {
  const { containerRef, draftRect, handlers } = useNewRectDrag(armedIndex !== null, canvasSizePx, (pixelRect) => {
    if (armedIndex === null) return;
    updateRow(armedIndex, { rect: pixelRectToPointRect(pixelRect, canvasSizePx, pageSizePt) });
    setArmedIndex(null);
  });

  const onPage = rows.map((row, index) => ({ row, index })).filter(({ row }) => row.page === page);

  return (
    <div ref={containerRef} data-testid="pdf-overlay" style={{ position: "absolute", inset: 0 }} {...handlers}>
      {onPage.map(({ row, index }) => (
        <PlacedBox
          key={index}
          rect={pointRectToPixelRect(row.rect, canvasSizePx, pageSizePt)}
          label={`Element ${index + 1}`}
          containerRef={containerRef}
          canvasSizePx={canvasSizePx}
          onChange={(pixelRect) => updateRow(index, { rect: pixelRectToPointRect(pixelRect, canvasSizePx, pageSizePt) })}
        />
      ))}
      {draftRect ? (
        <div style={{ position: "absolute", left: draftRect.x, top: draftRect.y, width: draftRect.width, height: draftRect.height, border: "2px dashed #2563eb" }} />
      ) : null}
    </div>
  );
}
