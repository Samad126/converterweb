"use client";

/**
 * `/pdf/edit` — the general-purpose sibling of `/pdf/sign`: draws free text,
 * an image, a rectangle, an ellipse, a line or a freehand stroke onto exact
 * page positions. Same VISUAL-mark caveat as `/pdf/sign` — this bakes pixels
 * into the page content, it is not an editable annotation layer.
 *
 * Positions are placed on a rendered page preview (`PdfPagePreview`) rather
 * than typed as numbers: text/image/rectangle/ellipse/line are a dragged box
 * (a line uses the box's two opposite corners as its endpoints); freehand is
 * captured as an actual pointer-drag path, recorded as a `points` array in
 * PDF points — the same coordinate contract the schema documents.
 */
import { useCallback, useRef, useState } from "react";

import { PdfPagePreview } from "@/components/PdfPagePreview";
import { PdfToolShell } from "@/components/PdfToolShell";
import { PlacedBox, useNewRectDrag } from "@/components/pdf/placement";
import {
  pagePointToPixelPoint,
  pixelPointToPagePoint,
  pixelRectToPointRect,
  pointRectToPixelRect,
  type Point,
  type Rect,
  type Size,
} from "@/lib/pdfCoords";
import { usePdfFileTool } from "@/lib/usePdfFileTool";
import type { PdfPart } from "@/lib/pdfApi";

type EditElementType = "text" | "image" | "rectangle" | "ellipse" | "line" | "freehand";

interface EditRow {
  type: EditElementType;
  page: number;
  // text/image/rectangle/ellipse; line uses the corners as its two endpoints.
  rect: Rect;
  value: string;
  fontSize: string;
  imageIndex: number | null;
  color: string;
  strokeWidth: string;
  fill: boolean;
  // freehand, in PDF points.
  points: Point[];
}

function emptyRow(page: number): EditRow {
  return {
    type: "text",
    page,
    rect: { x: 72, y: 700, width: 120, height: 40 },
    value: "",
    fontSize: "14",
    imageIndex: null,
    color: "black",
    strokeWidth: "2",
    fill: false,
    points: [],
  };
}

export function EditTool(): React.ReactElement {
  const tool = usePdfFileTool("/pdf/edit");
  const [rows, setRows] = useState<EditRow[]>([emptyRow(1)]);
  const [images, setImages] = useState<File[]>([]);
  const [page, setPage] = useState(1);
  const [armedIndex, setArmedIndex] = useState<number | null>(null);

  const updateRow = (index: number, patch: Partial<EditRow>): void => {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  function buildElement(row: EditRow): Record<string, unknown> | null {
    const { page: p, rect } = row;
    if (!Number.isFinite(p) || p < 1) return null;

    if (row.type === "text") {
      if (row.value.trim() === "") return null;
      const fontSize = Number(row.fontSize);
      return { type: "text", page: p, x: rect.x, y: rect.y, value: row.value, fontSize: Number.isFinite(fontSize) ? fontSize : 14, color: row.color };
    }
    if (row.type === "image") {
      if (rect.width <= 0 || rect.height <= 0 || row.imageIndex === null) return null;
      return { type: "image", page: p, x: rect.x, y: rect.y, width: rect.width, height: rect.height, imageIndex: row.imageIndex };
    }
    if (row.type === "rectangle" || row.type === "ellipse") {
      if (rect.width <= 0 || rect.height <= 0) return null;
      const strokeWidth = Number(row.strokeWidth);
      return {
        type: row.type,
        page: p,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        color: row.color,
        strokeWidth: Number.isFinite(strokeWidth) ? strokeWidth : 2,
        fill: row.fill,
      };
    }
    if (row.type === "line") {
      const strokeWidth = Number(row.strokeWidth);
      return {
        type: "line",
        page: p,
        x1: rect.x,
        y1: rect.y,
        x2: rect.x + rect.width,
        y2: rect.y + rect.height,
        color: row.color,
        strokeWidth: Number.isFinite(strokeWidth) ? strokeWidth : 2,
      };
    }
    // freehand
    if (row.points.length < 2) return null;
    const strokeWidth = Number(row.strokeWidth);
    return { type: "freehand", page: p, points: row.points, color: row.color, strokeWidth: Number.isFinite(strokeWidth) ? strokeWidth : 2 };
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
      <EditOverlay
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
        Every mark here is baked permanently into the page content — a visual edit, not an editable
        annotation layer and not a cryptographic signature.
      </p>

      <section className="flex flex-col gap-2">
        <h3 className="font-semibold">Images (for `image`-type elements)</h3>
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
      </section>

      <PdfPagePreview file={tool.file} page={page} onPageChange={setPage} overlay={overlay} />

      {rows.map((row, index) => (
        <fieldset key={index} className="panel flex flex-col gap-2">
          <legend className="font-semibold">Element {index + 1}</legend>

          <div className="flex gap-3">
            <label className="flex flex-col gap-1">
              <span>Type</span>
              <select className="input" value={row.type} onChange={(e) => updateRow(index, { type: e.target.value as EditElementType })}>
                <option value="text">Text</option>
                <option value="image">Image</option>
                <option value="rectangle">Rectangle</option>
                <option value="ellipse">Ellipse</option>
                <option value="line">Line</option>
                <option value="freehand">Freehand</option>
              </select>
            </label>
            <div className="flex flex-col gap-1 justify-end">
              <span className="meta">
                Page {row.page}
                {row.type === "freehand"
                  ? ` — ${row.points.length} point${row.points.length === 1 ? "" : "s"}`
                  : ` — x=${row.rect.x.toFixed(0)}, y=${row.rect.y.toFixed(0)}, w=${row.rect.width.toFixed(0)}, h=${row.rect.height.toFixed(0)} pt`}
              </span>
              <button
                type="button"
                className="btn-quiet self-start"
                onClick={() => {
                  setPage(row.page);
                  setArmedIndex(index);
                }}
              >
                {armedIndex === index
                  ? row.type === "freehand"
                    ? "Draw on the page above…"
                    : "Drag on the page above…"
                  : row.type === "freehand"
                    ? "Draw on page"
                    : "Place on page"}
              </button>
            </div>
          </div>

          {row.type === "text" ? (
            <div className="flex gap-3">
              <label className="flex flex-col gap-1">
                <span>Font size</span>
                <input type="number" className="input w-20" value={row.fontSize} onChange={(e) => updateRow(index, { fontSize: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <span>Color</span>
                <input type="text" className="input w-24" value={row.color} onChange={(e) => updateRow(index, { color: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1 flex-1">
                <span>Text</span>
                <input type="text" className="input" value={row.value} onChange={(e) => updateRow(index, { value: e.target.value })} />
              </label>
            </div>
          ) : null}

          {row.type === "image" ? (
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

          {row.type === "rectangle" || row.type === "ellipse" ? (
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-col gap-1">
                <span>Color</span>
                <input type="text" className="input w-24" value={row.color} onChange={(e) => updateRow(index, { color: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <span>Stroke width</span>
                <input type="number" className="input w-20" value={row.strokeWidth} onChange={(e) => updateRow(index, { strokeWidth: e.target.value })} />
              </label>
              <label className="flex items-center gap-2 self-end">
                <input type="checkbox" checked={row.fill} onChange={(e) => updateRow(index, { fill: e.target.checked })} />
                <span>Fill</span>
              </label>
            </div>
          ) : null}

          {row.type === "line" ? (
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-col gap-1">
                <span>Color</span>
                <input type="text" className="input w-24" value={row.color} onChange={(e) => updateRow(index, { color: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <span>Stroke width</span>
                <input type="number" className="input w-20" value={row.strokeWidth} onChange={(e) => updateRow(index, { strokeWidth: e.target.value })} />
              </label>
            </div>
          ) : null}

          {row.type === "freehand" ? (
            <div className="flex gap-3">
              <label className="flex flex-col gap-1">
                <span>Color</span>
                <input type="text" className="input w-24" value={row.color} onChange={(e) => updateRow(index, { color: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <span>Stroke width</span>
                <input type="number" className="input w-20" value={row.strokeWidth} onChange={(e) => updateRow(index, { strokeWidth: e.target.value })} />
              </label>
            </div>
          ) : null}

          <button type="button" className="btn-quiet self-start" onClick={() => setRows((current) => current.filter((_, i) => i !== index))} disabled={rows.length === 1}>
            Remove element
          </button>
        </fieldset>
      ))}

      <button type="button" className="btn-quiet self-start" onClick={() => setRows((current) => [...current, emptyRow(page)])}>
        Add another element
      </button>

      {!allValid ? <p className="meta">Every element needs a valid, complete placement for its type.</p> : null}
    </PdfToolShell>
  );
}

interface EditOverlayProps {
  canvasSizePx: Size;
  pageSizePt: Size;
  page: number;
  rows: EditRow[];
  armedIndex: number | null;
  setArmedIndex: (index: number | null) => void;
  updateRow: (index: number, patch: Partial<EditRow>) => void;
}

function EditOverlay({ canvasSizePx, pageSizePt, page, rows, armedIndex, setArmedIndex, updateRow }: EditOverlayProps): React.ReactElement {
  const armedRow = armedIndex !== null ? rows[armedIndex] : null;
  const isFreehandArmed = armedRow?.type === "freehand";

  const { containerRef, draftRect, handlers } = useNewRectDrag(armedIndex !== null && !isFreehandArmed, (pixelRect) => {
    if (armedIndex === null) return;
    updateRow(armedIndex, { rect: pixelRectToPointRect(pixelRect, canvasSizePx, pageSizePt) });
    setArmedIndex(null);
  });

  const freehand = useFreehandDrag(isFreehandArmed, (pixelPoints) => {
    if (armedIndex === null) return;
    updateRow(armedIndex, { points: pixelPoints.map((p) => pixelPointToPagePoint(p, canvasSizePx, pageSizePt)) });
    setArmedIndex(null);
  });

  const onPage = rows.map((row, index) => ({ row, index })).filter(({ row }) => row.page === page);

  return (
    <div
      ref={isFreehandArmed ? freehand.containerRef : containerRef}
      data-testid="pdf-overlay"
      style={{ position: "absolute", inset: 0 }}
      {...(isFreehandArmed ? freehand.handlers : handlers)}
    >
      {onPage.map(({ row, index }) =>
        row.type === "freehand" ? (
          row.points.length >= 2 ? (
            <FreehandPreview key={index} points={row.points} canvasSizePx={canvasSizePx} pageSizePt={pageSizePt} color={row.color} />
          ) : null
        ) : (
          <PlacedBox
            key={index}
            rect={pointRectToPixelRect(row.rect, canvasSizePx, pageSizePt)}
            label={`Element ${index + 1}`}
            onChange={(pixelRect) => updateRow(index, { rect: pixelRectToPointRect(pixelRect, canvasSizePx, pageSizePt) })}
          />
        ),
      )}
      {draftRect ? (
        <div style={{ position: "absolute", left: draftRect.x, top: draftRect.y, width: draftRect.width, height: draftRect.height, border: "2px dashed #2563eb" }} />
      ) : null}
      {freehand.draftPoints.length >= 2 ? (
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          <polyline
            points={freehand.draftPoints.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#2563eb"
            strokeWidth={2}
          />
        </svg>
      ) : null}
    </div>
  );
}

function FreehandPreview({ points, canvasSizePx, pageSizePt, color }: { points: Point[]; canvasSizePx: Size; pageSizePt: Size; color: string }): React.ReactElement {
  const pixelPoints = points.map((p) => pagePointToPixelPoint(p, canvasSizePx, pageSizePt));
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      <polyline points={pixelPoints.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={color === "black" ? "#000" : color} strokeWidth={2} />
    </svg>
  );
}

function useFreehandDrag(active: boolean, onCommit: (points: Point[]) => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draftPoints, setDraftPoints] = useState<Point[]>([]);
  const drawingRef = useRef(false);

  const pointFromEvent = useCallback((event: React.PointerEvent): Point | null => {
    const container = containerRef.current;
    if (!container) return null;
    const box = container.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!active || event.target !== event.currentTarget) return;
      const point = pointFromEvent(event);
      if (!point) return;
      drawingRef.current = true;
      setDraftPoints([point]);
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [active, pointFromEvent],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!drawingRef.current) return;
      const point = pointFromEvent(event);
      if (!point) return;
      setDraftPoints((current) => [...current, point]);
    },
    [pointFromEvent],
  );

  const onPointerUp = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    setDraftPoints((current) => {
      if (current.length >= 2) onCommit(current);
      return [];
    });
  }, [onCommit]);

  return { containerRef, draftPoints, handlers: { onPointerDown, onPointerMove, onPointerUp } };
}
