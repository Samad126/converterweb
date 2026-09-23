import { describe, expect, it } from "vitest";

import {
  pagePointToPixelPoint,
  pixelPointToPagePoint,
  pixelRectToPointRect,
  pointRectToPixelRect,
  rectFromCorners,
} from "@/lib/pdf/pdfCoords";

describe("pdfCoords", () => {
  const canvasSizePx = { width: 850, height: 1100 };
  const pageSizePt = { width: 612, height: 792 }; // US Letter

  it("converts a pixel rect to a point rect proportionally", () => {
    const rect = pixelRectToPointRect({ x: 85, y: 110, width: 170, height: 220 }, canvasSizePx, pageSizePt);
    expect(rect.x).toBeCloseTo(61.2, 5);
    expect(rect.y).toBeCloseTo(79.2, 5);
    expect(rect.width).toBeCloseTo(122.4, 5);
    expect(rect.height).toBeCloseTo(158.4, 5);
  });

  it("round-trips pixel -> point -> pixel", () => {
    const original = { x: 40, y: 900, width: 300, height: 50 };
    const asPoints = pixelRectToPointRect(original, canvasSizePx, pageSizePt);
    const back = pointRectToPixelRect(asPoints, canvasSizePx, pageSizePt);
    expect(back.x).toBeCloseTo(original.x, 5);
    expect(back.y).toBeCloseTo(original.y, 5);
    expect(back.width).toBeCloseTo(original.width, 5);
    expect(back.height).toBeCloseTo(original.height, 5);
  });

  it("converts a single point both ways", () => {
    const px = { x: 425, y: 550 };
    const pt = pixelPointToPagePoint(px, canvasSizePx, pageSizePt);
    expect(pt.x).toBeCloseTo(306, 5);
    expect(pt.y).toBeCloseTo(396, 5);
    const backToPx = pagePointToPixelPoint(pt, canvasSizePx, pageSizePt);
    expect(backToPx.x).toBeCloseTo(px.x, 5);
    expect(backToPx.y).toBeCloseTo(px.y, 5);
  });

  it("handles a zero-size canvas without dividing by zero", () => {
    const rect = pixelRectToPointRect({ x: 1, y: 1, width: 1, height: 1 }, { width: 0, height: 0 }, pageSizePt);
    expect(rect).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it("normalizes a drag between two arbitrary corners into a positive rect", () => {
    const rect = rectFromCorners({ x: 150, y: 200 }, { x: 50, y: 80 });
    expect(rect).toEqual({ x: 50, y: 80, width: 100, height: 120 });
  });
});
