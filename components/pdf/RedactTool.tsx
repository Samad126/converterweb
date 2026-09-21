"use client";

/**
 * `/pdf/redact` — permanently remove the content under one or more
 * rectangles, not draw over it. `areas` is a non-empty JSON array of
 * `{page, x, y, width, height}`, top-left origin, in points.
 *
 * Areas are drawn directly on a rendered page preview (`PdfPagePreview`):
 * drag across empty space to add one, drag its body to move it, drag its
 * corner handle to resize it. The drag happens in screen-pixel space and is
 * converted to PDF points via `lib/pdfCoords.ts`.
 */
import { useState } from "react";

import { PdfPagePreview } from "@/components/PdfPagePreview";
import { PdfToolShell } from "@/components/PdfToolShell";
import { PlacedBox, useNewRectDrag } from "@/components/pdf/placement";
import { pixelRectToPointRect, pointRectToPixelRect, type Rect, type Size } from "@/lib/pdfCoords";
import { usePdfFileTool } from "@/lib/usePdfFileTool";

interface RedactArea {
  page: number;
  rect: Rect; // PDF points, top-left origin.
}

export function RedactTool(): React.ReactElement {
  const tool = usePdfFileTool("/pdf/redact");
  const [areas, setAreas] = useState<RedactArea[]>([]);
  const [page, setPage] = useState(1);

  const validAreas = areas.filter((area) => area.rect.width > 0 && area.rect.height > 0);

  function overlay(canvasSizePx: Size, pageSizePt: Size): React.ReactNode {
    const onPage = areas
      .map((area, index) => ({ area, index }))
      .filter(({ area }) => area.page === page);

    return <RedactOverlay canvasSizePx={canvasSizePx} pageSizePt={pageSizePt} page={page} areas={onPage} setAreas={setAreas} />;
  }

  return (
    <PdfToolShell
      tool={tool}
      onRun={() => tool.run([{ name: "areas", value: JSON.stringify(validAreas.map(({ page: p, rect }) => ({ page: p, ...rect }))) }])}
    >
      <p className="meta">
        Permanent removal — the text, images and graphics under each rectangle are deleted from the
        document, not merely covered. A rectangle only removes what fully intersects it: an
        under-sized box leaves a readable fragment behind.
      </p>

      <p className="meta">Drag across the page below to mark an area for redaction. Drag a box&apos;s body to move it, its corner to resize it.</p>

      <PdfPagePreview file={tool.file} page={page} onPageChange={setPage} overlay={overlay} />

      <ul className="flex flex-col gap-1">
        {areas.map((area, index) => (
          <li key={index} className="meta flex items-center gap-2">
            Area {index + 1} — page {area.page}: x={area.rect.x.toFixed(1)}, y={area.rect.y.toFixed(1)}, w=
            {area.rect.width.toFixed(1)}, h={area.rect.height.toFixed(1)}
            <button type="button" className="btn-quiet" onClick={() => setAreas((current) => current.filter((_, i) => i !== index))}>
              Remove
            </button>
          </li>
        ))}
      </ul>

      {validAreas.length === 0 ? <p className="meta">At least one area with a positive width and height is required.</p> : null}
    </PdfToolShell>
  );
}

interface RedactOverlayProps {
  canvasSizePx: Size;
  pageSizePt: Size;
  page: number;
  areas: { area: RedactArea; index: number }[];
  setAreas: React.Dispatch<React.SetStateAction<RedactArea[]>>;
}

function RedactOverlay({ canvasSizePx, pageSizePt, page, areas, setAreas }: RedactOverlayProps): React.ReactElement {
  const { containerRef, draftRect, handlers } = useNewRectDrag(true, canvasSizePx, (pixelRect) => {
    const rect = pixelRectToPointRect(pixelRect, canvasSizePx, pageSizePt);
    setAreas((current) => [...current, { page, rect }]);
  });

  return (
    <div ref={containerRef} data-testid="pdf-overlay" style={{ position: "absolute", inset: 0 }} {...handlers}>
      {areas.map(({ area, index }) => (
        <PlacedBox
          key={index}
          rect={pointRectToPixelRect(area.rect, canvasSizePx, pageSizePt)}
          color="#dc2626"
          label={`Area ${index + 1}`}
          containerRef={containerRef}
          canvasSizePx={canvasSizePx}
          onChange={(pixelRect) =>
            setAreas((current) =>
              current.map((a, i) => (i === index ? { ...a, rect: pixelRectToPointRect(pixelRect, canvasSizePx, pageSizePt) } : a)),
            )
          }
          onRemove={() => setAreas((current) => current.filter((_, i) => i !== index))}
        />
      ))}
      {draftRect ? <div style={{ position: "absolute", left: draftRect.x, top: draftRect.y, width: draftRect.width, height: draftRect.height, border: "2px dashed #dc2626" }} /> : null}
    </div>
  );
}
