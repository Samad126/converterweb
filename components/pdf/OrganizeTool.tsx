"use client";

/**
 * `/pdf/organize` — rearrange a PDF's pages into `order`, which must name
 * every page exactly once. Unlike `/pdf/extract-pages`, a selection that
 * would drop or duplicate a page is refused, because reordering and removing
 * are different operations here.
 */
import { useState } from "react";

import { PdfToolShell } from "@/components/PdfToolShell";
import { usePdfFileTool } from "@/lib/usePdfFileTool";

export function OrganizeTool(): React.ReactElement {
  const tool = usePdfFileTool("/pdf/organize");
  const [order, setOrder] = useState("");

  return (
    <PdfToolShell tool={tool} onRun={() => tool.run([{ name: "order", value: order }])}>
      <label className="flex flex-col gap-1">
        <span>New page order</span>
        <input
          type="text"
          placeholder="3,1,2"
          value={order}
          onChange={(event) => setOrder(event.target.value)}
          className="input"
        />
      </label>
      <p className="meta">
        Every page of the document, named exactly once, as 1-based page numbers and inclusive
        ranges: <code>3,1,2</code> on a 3-page document reorders it. <code>1,2</code> or{" "}
        <code>1,1,2</code> is refused — use Remove pages to drop one instead.
      </p>
    </PdfToolShell>
  );
}
