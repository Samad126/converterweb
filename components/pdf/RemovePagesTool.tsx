"use client";

/**
 * `/pdf/remove-pages` — delete the named pages, keeping everything else in
 * its original order.
 *
 * `pages` is a plain text field rather than a visual picker, per the product
 * decision to keep the page-selection tools textual this pass — see the note
 * on `ExtractPagesTool` and `OrganizeTool` for the same choice.
 */
import { useState } from "react";

import { PdfToolShell } from "@/components/pdf/PdfToolShell";
import { usePdfFileTool } from "@/lib/pdf/usePdfFileTool";

export function RemovePagesTool(): React.ReactElement {
  const tool = usePdfFileTool("/pdf/remove-pages");
  const [pages, setPages] = useState("");

  return (
    <PdfToolShell tool={tool} onRun={() => tool.run([{ name: "pages", value: pages }])}>
      <label className="flex flex-col gap-1">
        <span>Pages to remove</span>
        <input
          type="text"
          placeholder="2,5-7,10"
          value={pages}
          onChange={(event) => setPages(event.target.value)}
          className="input"
        />
      </label>
      <p className="meta">
        1-based page numbers and inclusive ranges, comma separated: <code>2,5-7,10</code>.
        Removing every page is refused.
      </p>
    </PdfToolShell>
  );
}
