"use client";

/**
 * Drag-to-create and drag-to-move/resize primitives shared by the overlays
 * `SignTool`, `RedactTool` and `EditTool` render inside `PdfPagePreview`.
 * Everything here works in canvas-pixel space (`canvasSizePx` from
 * `PdfPagePreview`) — converting to/from PDF points is the caller's job, via
 * `lib/pdfCoords.ts`.
 *
 * The overlay's rendered box can be narrower than `canvasSizePx` — the
 * preview scales down to fit its column on a narrow screen — so every raw
 * `clientX`/`clientY` delta is rescaled by the ratio between the box's
 * *displayed* size (`getBoundingClientRect()`) and its *coordinate-space*
 * size (`canvasSizePx`) before it is treated as a canvas-pixel offset.
 * Skipping this would place or drag a box to the wrong spot the moment the
 * preview is shown any smaller than its native render resolution.
 */
import { useCallback, useRef, useState } from "react";

import type { Size } from "@/lib/pdfCoords";
import { rectFromCorners, type Point, type Rect } from "@/lib/pdfCoords";

/** How many canvas-pixel units one *displayed* pixel of `box` covers. */
function displayScale(box: { width: number; height: number }, canvasSizePx: Size): { sx: number; sy: number } {
  return {
    sx: box.width === 0 ? 1 : canvasSizePx.width / box.width,
    sy: box.height === 0 ? 1 : canvasSizePx.height / box.height,
  };
}

/**
 * A `Rect` in canvas-pixel space as inline `left`/`top`/`width`/`height` in
 * percent of `canvasSizePx` — for the same reason `PlacedBox` positions
 * itself in percent below: the overlay can be displayed smaller than
 * `canvasSizePx`, so a literal pixel value would land in the wrong place.
 */
export function rectStylePercent(rect: Rect, canvasSizePx: Size): React.CSSProperties {
  const left = canvasSizePx.width === 0 ? 0 : (rect.x / canvasSizePx.width) * 100;
  const top = canvasSizePx.height === 0 ? 0 : (rect.y / canvasSizePx.height) * 100;
  const width = canvasSizePx.width === 0 ? 0 : (rect.width / canvasSizePx.width) * 100;
  const height = canvasSizePx.height === 0 ? 0 : (rect.height / canvasSizePx.height) * 100;
  return { position: "absolute", left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` };
}

function pointFromEvent(container: HTMLElement, event: React.PointerEvent, canvasSizePx: Size): Point {
  const box = container.getBoundingClientRect();
  const { sx, sy } = displayScale(box, canvasSizePx);
  return { x: (event.clientX - box.left) * sx, y: (event.clientY - box.top) * sy };
}

/**
 * Attach to the overlay container to draw a brand-new rectangle by dragging
 * across empty space. Disabled (`active = false`) once a tool wants to let
 * existing boxes be moved/resized without starting a new one underneath.
 */
export function useNewRectDrag(active: boolean, canvasSizePx: Size, onCommit: (rect: Rect) => void) {
  const [draft, setDraft] = useState<{ start: Point; current: Point } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!active || event.target !== event.currentTarget) return;
      const container = containerRef.current;
      if (!container) return;
      const point = pointFromEvent(container, event, canvasSizePx);
      setDraft({ start: point, current: point });
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [active, canvasSizePx],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      if (!draft || !container) return;
      setDraft({ start: draft.start, current: pointFromEvent(container, event, canvasSizePx) });
    },
    [draft, canvasSizePx],
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
  /** A preview of what the element will actually contain — typed text, or an image. */
  children?: React.ReactNode;
  /**
   * The overlay's container element and its coordinate-space size, so a drag
   * delta measured in *displayed* client pixels can be rescaled into
   * `canvasSizePx` units — see the module comment above.
   */
  containerRef: React.RefObject<HTMLDivElement | null>;
  canvasSizePx: Size;
}

/** An existing element's box: draggable by its body, resizable by its corner handle. */
export function PlacedBox({
  rect,
  onChange,
  onRemove,
  label,
  color = "#2563eb",
  className,
  children,
  containerRef,
  canvasSizePx,
}: PlacedBoxProps): React.ReactElement {
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
    const box = containerRef.current?.getBoundingClientRect();
    const { sx, sy } = box ? displayScale(box, canvasSizePx) : { sx: 1, sy: 1 };
    const dx = (event.clientX - drag.start.x) * sx;
    const dy = (event.clientY - drag.start.y) * sy;
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
        ...rectStylePercent(rect, canvasSizePx),
        border: `2px solid ${color}`,
        background: `${color}22`,
        cursor: "move",
        boxSizing: "border-box",
        overflow: "hidden",
        // Without this, a touch screen treats the first move as a page
        // scroll gesture and cancels the drag before onPointerMove ever
        // sees it — this is what made dragging unreliable on phones.
        touchAction: "none",
      }}
      onPointerDown={onBodyPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {children}
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
          // A 10px square is a fine mouse target but too small to reliably
          // hit with a finger — this pads the actual (invisible) touch
          // target out to 28px while keeping the visible dot at 10px, via
          // a centered ::after-style inner box.
          right: -14,
          bottom: -14,
          width: 28,
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "nwse-resize",
          touchAction: "none",
        }}
      >
        <div style={{ width: 10, height: 10, background: color, borderRadius: 2 }} />
      </div>
    </div>
  );
}
