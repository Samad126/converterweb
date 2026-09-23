"use client";

/**
 * `/pdf/extract-pages` — keep only the named pages, in the exact order named,
 * so `pages=3,1` extracts pages 1 and 3 with page 3 first.
 *
 * A plain text field for the page list rather than a visual picker: a clear
 * textual control is honest about what this pass builds, where the full
 * visual page-preview primitive is explicitly deferred to a later pass (see
 * the task brief for `sign`/`compare`/`redact`/`edit`).
 */
import { useState } from "react";

import { PdfToolShell } from "@/components/pdf/PdfToolShell";
import { usePdfFileTool } from "@/lib/pdf/usePdfFileTool";

export function ExtractPagesTool(): React.ReactElement {
  const tool = usePdfFileTool("/pdf/extract-pages");
  const [pages, setPages] = useState("");

  return (
    <PdfToolShell tool={tool} onRun={() => tool.run([{ name: "pages", value: pages }])}>
      <label className="flex flex-col gap-1">
        <span>Pages to keep, in order</span>
        <input
          type="text"
          placeholder="1,3-4"
          value={pages}
          onChange={(event) => setPages(event.target.value)}
          className="input"
        />
      </label>
      <p className="meta">
        1-based page numbers and inclusive ranges, comma separated, in the order they should appear:{" "}
        <code>3,1,2</code> keeps pages 1-3, reordered.
      </p>
    </PdfToolShell>
  );
}
