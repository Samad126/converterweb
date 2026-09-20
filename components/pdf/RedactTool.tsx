"use client";

/**
 * `/pdf/redact` — permanently remove the content under one or more
 * rectangles, not draw over it. `areas` is a non-empty JSON array of
 * `{page, x, y, width, height}`, top-left origin, in points.
 *
 * Coordinates are entered numerically rather than drawn on a page preview —
 * see the accompanying report for why (no `pdf.js` preview primitive was
 * built in this pass). Every field is validated client-side before submit.
 */
import { useState } from "react";

import { PdfToolShell } from "@/components/PdfToolShell";
import { usePdfFileTool } from "@/lib/usePdfFileTool";

interface RedactArea {
  page: string;
  x: string;
  y: string;
  width: string;
  height: string;
}

function emptyArea(): RedactArea {
  return { page: "1", x: "0", y: "0", width: "100", height: "20" };
}

export function RedactTool(): React.ReactElement {
  const tool = usePdfFileTool("/pdf/redact");
  const [areas, setAreas] = useState<RedactArea[]>([emptyArea()]);

  const updateArea = (index: number, patch: Partial<RedactArea>): void => {
    setAreas((current) => current.map((area, i) => (i === index ? { ...area, ...patch } : area)));
  };

  const validAreas = areas
    .map((area) => ({
      page: Number(area.page),
      x: Number(area.x),
      y: Number(area.y),
      width: Number(area.width),
      height: Number(area.height),
    }))
    .filter(
      (area) =>
        Number.isFinite(area.page) &&
        area.page >= 1 &&
        Number.isFinite(area.x) &&
        Number.isFinite(area.y) &&
        area.width > 0 &&
        area.height > 0,
    );

  return (
    <PdfToolShell
      tool={tool}
      onRun={() => tool.run([{ name: "areas", value: JSON.stringify(validAreas) }])}
    >
      <p className="meta">
        Permanent removal — the text, images and graphics under each rectangle are deleted from the
        document, not merely covered. A rectangle only removes what fully intersects it: an
        under-sized box leaves a readable fragment behind.
      </p>

      {areas.map((area, index) => (
        <fieldset key={index} className="panel flex flex-col gap-2">
          <legend className="font-semibold">Area {index + 1}</legend>
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1">
              <span>Page</span>
              <input
                type="number"
                min={1}
                className="input w-24"
                value={area.page}
                onChange={(event) => updateArea(index, { page: event.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span>X (pt)</span>
              <input
                type="number"
                className="input w-24"
                value={area.x}
                onChange={(event) => updateArea(index, { x: event.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span>Y (pt)</span>
              <input
                type="number"
                className="input w-24"
                value={area.y}
                onChange={(event) => updateArea(index, { y: event.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span>Width (pt)</span>
              <input
                type="number"
                className="input w-24"
                value={area.width}
                onChange={(event) => updateArea(index, { width: event.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span>Height (pt)</span>
              <input
                type="number"
                className="input w-24"
                value={area.height}
                onChange={(event) => updateArea(index, { height: event.target.value })}
              />
            </label>
          </div>
          <button
            type="button"
            className="btn-quiet self-start"
            onClick={() => setAreas((current) => current.filter((_, i) => i !== index))}
            disabled={areas.length === 1}
          >
            Remove area
          </button>
        </fieldset>
      ))}

      <button type="button" className="btn-quiet self-start" onClick={() => setAreas((current) => [...current, emptyArea()])}>
        Add another area
      </button>

      {validAreas.length === 0 ? <p className="meta">At least one area with a positive width and height is required.</p> : null}
    </PdfToolShell>
  );
}
