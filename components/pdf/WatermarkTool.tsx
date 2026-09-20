"use client";

/**
 * `/pdf/watermark` — stamp `text` across the named pages (or every page),
 * semi-transparent, over the original page content.
 */
import { useState } from "react";

import { PdfToolShell } from "@/components/PdfToolShell";
import { usePdfFileTool } from "@/lib/usePdfFileTool";

export function WatermarkTool(): React.ReactElement {
  const tool = usePdfFileTool("/pdf/watermark");
  const [text, setText] = useState("");
  const [pages, setPages] = useState("");

  return (
    <PdfToolShell
      tool={tool}
      onRun={() =>
        tool.run([
          { name: "text", value: text },
          ...(pages.trim() === "" ? [] : [{ name: "pages", value: pages }]),
        ])
      }
    >
      <label className="flex flex-col gap-1">
        <span>Watermark text</span>
        <input
          type="text"
          placeholder="CONFIDENTIAL"
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="input"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span>Pages to stamp (optional)</span>
        <input
          type="text"
          placeholder="1,3"
          value={pages}
          onChange={(event) => setPages(event.target.value)}
          className="input"
        />
      </label>
      <p className="meta">1-based page numbers and inclusive ranges. Omit to stamp every page.</p>
    </PdfToolShell>
  );
}
