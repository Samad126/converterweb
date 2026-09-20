"use client";

/**
 * Drag-to-create and drag-to-move/resize primitives shared by the overlays
 * `SignTool`, `RedactTool` and `EditTool` render inside `PdfPagePreview`.
 * Everything here works in screen-pixel space only — converting to/from PDF
 * points is the caller's job, via `lib/pdfCoords.ts`.
 */
import { useCallback, useRef, useState } from "react";

import { rectFromCorners, type Point, type Rect } from "@/lib/pdfCoords";

function pointFromEvent(container: HTMLElement, event: React.PointerEvent): Point {
  const box = container.getBoundingClientRect();
  return { x: event.clientX - box.left, y: event.clientY - box.top };
}

/**
 * Attach to the overlay container to draw a brand-new rectangle by dragging
 * across empty space. Disabled (`active = false`) once a tool wants to let
 * existing boxes be moved/resized without starting a new one underneath.
 */
export function useNewRectDrag(active: boolean, onCommit: (rect: Rect) => void) {
  const [draft, setDraft] = useState<{ start: Point; current: Point } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!active || event.target !== event.currentTarget) return;
      const container = containerRef.current;
      if (!container) return;
      const point = pointFromEvent(container, event);
      setDraft({ start: point, current: point });
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [active],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      if (!draft || !container) return;
      setDraft({ start: draft.start, current: pointFromEvent(container, event) });
    },
    [draft],
  );

  const onPointerUp = useCallback(() => {
    if (!draft) return;
    const rect = rectFromCorners(draft.start, draft.current);
    setDraft(null);
    if (rect.width < 4 || rect.height < 4) return; // A tap, not a drag.
    onCommit(rect);
  }, [draft, onCommit]);

  const draftRect = draft ? rectFromCorners(draft.start, draft.current) : null;

  return { containerRef, draftRect, handlers: { onPointerDown, onPointerMove, onPointerUp } };
}

export interface PlacedBoxProps {
  rect: Rect;
  onChange: (rect: Rect) => void;
  onRemove?: () => void;
  label?: string;
  color?: string;
  className?: string;
}

/** An existing element's box: draggable by its body, resizable by its corner handle. */
export function PlacedBox({ rect, onChange, onRemove, label, color = "#2563eb", className }: PlacedBoxProps): React.ReactElement {
  const dragRef = useRef<{ mode: "move" | "resize"; start: Point; rect: Rect } | null>(null);

  const startDrag = (mode: "move" | "resize", event: React.PointerEvent<HTMLDivElement>): void => {
    event.stopPropagation();
    dragRef.current = { mode, start: { x: event.clientX, y: event.clientY }, rect };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onBodyPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => startDrag("move", event);
  const onHandlePointerDown = (event: React.PointerEvent<HTMLDivElement>): void => startDrag("resize", event);

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.start.x;
    const dy = event.clientY - drag.start.y;
    if (drag.mode === "move") {
      onChange({ ...drag.rect, x: drag.rect.x + dx, y: drag.rect.y + dy });
    } else {
      onChange({ ...drag.rect, width: Math.max(4, drag.rect.width + dx), height: Math.max(4, drag.rect.height + dy) });
    }
  };

  const onPointerUp = (): void => {
    dragRef.current = null;
  };

  return (
    <div
      className={className}
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        border: `2px solid ${color}`,
        background: `${color}22`,
        cursor: "move",
        boxSizing: "border-box",
      }}
      onPointerDown={onBodyPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {label ? (
        <span style={{ position: "absolute", top: -20, left: 0, fontSize: 11, color, whiteSpace: "nowrap" }}>{label}</span>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          className="btn-quiet"
          style={{ position: "absolute", top: -22, right: -8, padding: "0 4px", fontSize: 10 }}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onRemove}
        >
          ×
        </button>
      ) : null}
      <div
        onPointerDown={onHandlePointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          position: "absolute",
          right: -5,
          bottom: -5,
          width: 10,
          height: 10,
          background: color,
          cursor: "nwse-resize",
        }}
      />
    </div>
  );
}
