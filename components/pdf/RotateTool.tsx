"use client";

/**
 * `/pdf/rotate` — rotate the named pages (or every page) by `degrees`
 * clockwise, added to each page's existing rotation.
 */
import { useState } from "react";

import { PdfToolShell } from "@/components/PdfToolShell";
import { usePdfFileTool } from "@/lib/usePdfFileTool";

export function RotateTool(): React.ReactElement {
  const tool = usePdfFileTool("/pdf/rotate");
  const [degrees, setDegrees] = useState("90");
  const [pages, setPages] = useState("");

  return (
    <PdfToolShell
      tool={tool}
      onRun={() =>
        tool.run([
          { name: "degrees", value: degrees },
          ...(pages.trim() === "" ? [] : [{ name: "pages", value: pages }]),
        ])
      }
    >
      <label className="flex flex-col gap-1">
        <span>Rotation, clockwise degrees</span>
        <input
          type="number"
          step={90}
          inputMode="numeric"
          value={degrees}
          onChange={(event) => setDegrees(event.target.value)}
          className="input"
        />
      </label>
      <p className="meta">A multiple of 90 — may be negative.</p>

      <label className="flex flex-col gap-1">
        <span>Pages to rotate (optional)</span>
        <input
          type="text"
          placeholder="1,3"
          value={pages}
          onChange={(event) => setPages(event.target.value)}
          className="input"
        />
      </label>
      <p className="meta">1-based page numbers and inclusive ranges. Omit to rotate every page.</p>
    </PdfToolShell>
  );
}
