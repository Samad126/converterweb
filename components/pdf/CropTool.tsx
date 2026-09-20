"use client";

/**
 * `/pdf/crop` — shrink the named pages' (or every page's) crop box by
 * trimming `left`/`right`/`top`/`bottom` points off each edge. Each defaults
 * to `0` server-side; only a field the person actually sets is sent, so a
 * blank field means "no change" rather than an explicit `0`.
 */
import { useState } from "react";

import { PdfToolShell } from "@/components/PdfToolShell";
import type { PdfPart } from "@/lib/pdfApi";
import { usePdfFileTool } from "@/lib/usePdfFileTool";

export function CropTool(): React.ReactElement {
  const tool = usePdfFileTool("/pdf/crop");
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [top, setTop] = useState("");
  const [bottom, setBottom] = useState("");
  const [pages, setPages] = useState("");

  return (
    <PdfToolShell
      tool={tool}
      onRun={() => {
        const parts: PdfPart[] = [];
        if (left.trim() !== "") parts.push({ name: "left", value: left });
        if (right.trim() !== "") parts.push({ name: "right", value: right });
        if (top.trim() !== "") parts.push({ name: "top", value: top });
        if (bottom.trim() !== "") parts.push({ name: "bottom", value: bottom });
        if (pages.trim() !== "") parts.push({ name: "pages", value: pages });
        tool.run(parts);
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span>Left (points)</span>
          <input type="number" min={0} value={left} onChange={(e) => setLeft(e.target.value)} className="input" />
        </label>
        <label className="flex flex-col gap-1">
          <span>Right (points)</span>
          <input type="number" min={0} value={right} onChange={(e) => setRight(e.target.value)} className="input" />
        </label>
        <label className="flex flex-col gap-1">
          <span>Top (points)</span>
          <input type="number" min={0} value={top} onChange={(e) => setTop(e.target.value)} className="input" />
        </label>
        <label className="flex flex-col gap-1">
          <span>Bottom (points)</span>
          <input type="number" min={0} value={bottom} onChange={(e) => setBottom(e.target.value)} className="input" />
        </label>
      </div>
      <p className="meta">Each defaults to 0. This shrinks the crop box; the trimmed area is still in the file.</p>

      <label className="flex flex-col gap-1">
        <span>Pages to crop (optional)</span>
        <input
          type="text"
          placeholder="1,3"
          value={pages}
          onChange={(event) => setPages(event.target.value)}
          className="input"
        />
      </label>
      <p className="meta">1-based page numbers and inclusive ranges. Omit to crop every page.</p>
    </PdfToolShell>
  );
}
