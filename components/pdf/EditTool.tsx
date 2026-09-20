"use client";

/**
 * `/pdf/edit` — the general-purpose sibling of `/pdf/sign`: draws free text,
 * an image, a rectangle, an ellipse, a line or a freehand stroke onto exact
 * page positions. Same VISUAL-mark caveat as `/pdf/sign` — this bakes pixels
 * into the page content, it is not an editable annotation layer.
 *
 * Positions are entered numerically rather than dragged on a rendered page
 * preview — see the accompanying report for why a `pdf.js` preview primitive
 * was not built in this pass. Freehand strokes are entered as a typed list of
 * `x,y` points, the same coordinate contract the schema documents.
 */
import { useState } from "react";

import { PdfToolShell } from "@/components/PdfToolShell";
import { usePdfFileTool } from "@/lib/usePdfFileTool";
import type { PdfPart } from "@/lib/pdfApi";

type EditElementType = "text" | "image" | "rectangle" | "ellipse" | "line" | "freehand";

interface EditRow {
  type: EditElementType;
  page: string;
  // text
  x: string;
  y: string;
  value: string;
  fontSize: string;
  // image / rectangle / ellipse
  width: string;
  height: string;
  imageIndex: number | null;
  // rectangle / ellipse / line / freehand
  color: string;
  strokeWidth: string;
  fill: boolean;
  // line
  x1: string;
  y1: string;
  x2: string;
  y2: string;
  // freehand
  points: string;
}

function emptyRow(): EditRow {
  return {
    type: "text",
    page: "1",
    x: "72",
    y: "700",
    value: "",
    fontSize: "14",
    width: "120",
    height: "40",
    imageIndex: null,
    color: "black",
    strokeWidth: "2",
    fill: false,
    x1: "72",
    y1: "400",
    x2: "220",
    y2: "400",
    points: "72,350 90,360 110,345",
  };
}

function parsePoints(raw: string): { x: number; y: number }[] | null {
  const parts = raw
    .split(/\s+/)
    .map((s) => s.trim())
    .filter((s) => s !== "");
  const points = parts.map((part) => {
    const [xStr, yStr] = part.split(",");
    return { x: Number(xStr), y: Number(yStr) };
  });
  if (points.length < 2) return null;
  if (points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null;
  return points;
}

export function EditTool(): React.ReactElement {
  const tool = usePdfFileTool("/pdf/edit");
  const [rows, setRows] = useState<EditRow[]>([emptyRow()]);
  const [images, setImages] = useState<File[]>([]);

  const updateRow = (index: number, patch: Partial<EditRow>): void => {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  function buildElement(row: EditRow): Record<string, unknown> | null {
    const page = Number(row.page);
    if (!Number.isFinite(page) || page < 1) return null;

    if (row.type === "text") {
      if (row.value.trim() === "") return null;
      const x = Number(row.x);
      const y = Number(row.y);
      const fontSize = Number(row.fontSize);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return { type: "text", page, x, y, value: row.value, fontSize: Number.isFinite(fontSize) ? fontSize : 14, color: row.color };
    }
    if (row.type === "image") {
      const x = Number(row.x);
      const y = Number(row.y);
      const width = Number(row.width);
      const height = Number(row.height);
      if (!Number.isFinite(x) || !Number.isFinite(y) || width <= 0 || height <= 0) return null;
      if (row.imageIndex === null) return null;
      return { type: "image", page, x, y, width, height, imageIndex: row.imageIndex };
    }
    if (row.type === "rectangle" || row.type === "ellipse") {
      const x = Number(row.x);
      const y = Number(row.y);
      const width = Number(row.width);
      const height = Number(row.height);
      const strokeWidth = Number(row.strokeWidth);
      if (!Number.isFinite(x) || !Number.isFinite(y) || width <= 0 || height <= 0) return null;
      return {
        type: row.type,
        page,
        x,
        y,
        width,
        height,
        color: row.color,
        strokeWidth: Number.isFinite(strokeWidth) ? strokeWidth : 2,
        fill: row.fill,
      };
    }
    if (row.type === "line") {
      const x1 = Number(row.x1);
      const y1 = Number(row.y1);
      const x2 = Number(row.x2);
      const y2 = Number(row.y2);
      const strokeWidth = Number(row.strokeWidth);
      if (![x1, y1, x2, y2].every(Number.isFinite)) return null;
      return { type: "line", page, x1, y1, x2, y2, color: row.color, strokeWidth: Number.isFinite(strokeWidth) ? strokeWidth : 2 };
    }
    // freehand
    const points = parsePoints(row.points);
    if (points === null) return null;
    return { type: "freehand", page, points, color: row.color, strokeWidth: Number(row.strokeWidth) || 2 };
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
            <label className="flex flex-col gap-1">
              <span>Page</span>
              <input type="number" min={1} className="input w-20" value={row.page} onChange={(e) => updateRow(index, { page: e.target.value })} />
            </label>
          </div>

          {row.type === "text" ? (
            <>
              <div className="flex gap-3">
                <label className="flex flex-col gap-1">
                  <span>X (pt)</span>
                  <input type="number" className="input w-20" value={row.x} onChange={(e) => updateRow(index, { x: e.target.value })} />
                </label>
                <label className="flex flex-col gap-1">
                  <span>Y (pt)</span>
                  <input type="number" className="input w-20" value={row.y} onChange={(e) => updateRow(index, { y: e.target.value })} />
                </label>
                <label className="flex flex-col gap-1">
                  <span>Font size</span>
                  <input type="number" className="input w-20" value={row.fontSize} onChange={(e) => updateRow(index, { fontSize: e.target.value })} />
                </label>
                <label className="flex flex-col gap-1">
                  <span>Color</span>
                  <input type="text" className="input w-24" value={row.color} onChange={(e) => updateRow(index, { color: e.target.value })} />
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <span>Text</span>
                <input type="text" className="input" value={row.value} onChange={(e) => updateRow(index, { value: e.target.value })} />
              </label>
            </>
          ) : null}

          {row.type === "image" ? (
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-col gap-1">
                <span>X (pt)</span>
                <input type="number" className="input w-20" value={row.x} onChange={(e) => updateRow(index, { x: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <span>Y (pt)</span>
                <input type="number" className="input w-20" value={row.y} onChange={(e) => updateRow(index, { y: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <span>Width (pt)</span>
                <input type="number" className="input w-20" value={row.width} onChange={(e) => updateRow(index, { width: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <span>Height (pt)</span>
                <input type="number" className="input w-20" value={row.height} onChange={(e) => updateRow(index, { height: e.target.value })} />
              </label>
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
            </div>
          ) : null}

          {row.type === "rectangle" || row.type === "ellipse" ? (
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-col gap-1">
                <span>X (pt)</span>
                <input type="number" className="input w-20" value={row.x} onChange={(e) => updateRow(index, { x: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <span>Y (pt)</span>
                <input type="number" className="input w-20" value={row.y} onChange={(e) => updateRow(index, { y: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <span>Width (pt)</span>
                <input type="number" className="input w-20" value={row.width} onChange={(e) => updateRow(index, { width: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <span>Height (pt)</span>
                <input type="number" className="input w-20" value={row.height} onChange={(e) => updateRow(index, { height: e.target.value })} />
              </label>
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
                <span>X1 (pt)</span>
                <input type="number" className="input w-20" value={row.x1} onChange={(e) => updateRow(index, { x1: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <span>Y1 (pt)</span>
                <input type="number" className="input w-20" value={row.y1} onChange={(e) => updateRow(index, { y1: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <span>X2 (pt)</span>
                <input type="number" className="input w-20" value={row.x2} onChange={(e) => updateRow(index, { x2: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <span>Y2 (pt)</span>
                <input type="number" className="input w-20" value={row.y2} onChange={(e) => updateRow(index, { y2: e.target.value })} />
              </label>
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
            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1">
                <span>Points — space-separated `x,y` pairs, in points, at least two</span>
                <input type="text" className="input" value={row.points} onChange={(e) => updateRow(index, { points: e.target.value })} />
              </label>
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
            </div>
          ) : null}

          <button type="button" className="btn-quiet self-start" onClick={() => setRows((current) => current.filter((_, i) => i !== index))} disabled={rows.length === 1}>
            Remove element
          </button>
        </fieldset>
      ))}

      <button type="button" className="btn-quiet self-start" onClick={() => setRows((current) => [...current, emptyRow()])}>
        Add another element
      </button>

      {!allValid ? <p className="meta">Every element needs valid, complete coordinates for its type.</p> : null}
    </PdfToolShell>
  );
}
