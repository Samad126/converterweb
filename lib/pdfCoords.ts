/**
 * Pixel <-> PDF-point conversion for `PdfPagePreview`.
 *
 * Every `/pdf/sign`, `/pdf/redact` and `/pdf/edit` coordinate is in PDF
 * points, top-left origin, at the page's real (unscaled) size — exactly what
 * `page.getViewport({ scale: 1 })` reports as `width`/`height`. The preview
 * renders the page into a canvas at some display scale, so a box the user
 * drags on screen is always in canvas-pixel space and has to be converted
 * before it goes on the wire.
 *
 * Both spaces share a top-left origin, so the conversion is a plain
 * uniform-ish scale (independent ratios for x/y, in case width/height were
 * ever rendered non-uniformly) — no axis flip is needed.
 *
 * Kept dependency-free and pure so the conversion math is unit-testable
 * without a real `<canvas>` or `pdf.js` in the loop.
 */

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/** PDF points per rendered canvas pixel, along each axis. */
export function pointsPerPixel(canvasSizePx: Size, pageSizePt: Size): { sx: number; sy: number } {
  const sx = canvasSizePx.width === 0 ? 0 : pageSizePt.width / canvasSizePx.width;
  const sy = canvasSizePx.height === 0 ? 0 : pageSizePt.height / canvasSizePx.height;
  return { sx, sy };
}

export function pixelRectToPointRect(rect: Rect, canvasSizePx: Size, pageSizePt: Size): Rect {
  const { sx, sy } = pointsPerPixel(canvasSizePx, pageSizePt);
  return { x: rect.x * sx, y: rect.y * sy, width: rect.width * sx, height: rect.height * sy };
}

export function pointRectToPixelRect(rect: Rect, canvasSizePx: Size, pageSizePt: Size): Rect {
  const { sx, sy } = pointsPerPixel(canvasSizePx, pageSizePt);
  const px = sx === 0 ? 0 : 1 / sx;
  const py = sy === 0 ? 0 : 1 / sy;
  return { x: rect.x * px, y: rect.y * py, width: rect.width * px, height: rect.height * py };
}

export function pixelPointToPagePoint(point: Point, canvasSizePx: Size, pageSizePt: Size): Point {
  const { sx, sy } = pointsPerPixel(canvasSizePx, pageSizePt);
  return { x: point.x * sx, y: point.y * sy };
}

export function pagePointToPixelPoint(point: Point, canvasSizePx: Size, pageSizePt: Size): Point {
  const { sx, sy } = pointsPerPixel(canvasSizePx, pageSizePt);
  const px = sx === 0 ? 0 : 1 / sx;
  const py = sy === 0 ? 0 : 1 / sy;
  return { x: point.x * px, y: point.y * py };
}

/** Normalizes a drag from two arbitrary corners into a positive-size rect. */
export function rectFromCorners(a: Point, b: Point): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
}
