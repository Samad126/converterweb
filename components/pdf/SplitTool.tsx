"use client";

/**
 * `/pdf/split` — cut a PDF into consecutive chunks of `every` pages each,
 * always answered as a ZIP of `part-1.pdf`, `part-2.pdf`, ... — even for a
 * single part, which is why this is the one tool in `/pdf/*` whose response
 * media type is `application/zip` rather than `application/pdf`.
 */
import { useState } from "react";

import { PdfToolShell } from "@/components/PdfToolShell";
import { usePdfFileTool } from "@/lib/usePdfFileTool";

export function SplitTool(): React.ReactElement {
  const tool = usePdfFileTool("/pdf/split", {
    responseMediaType: "application/zip",
    downloadExtension: ".zip",
  });
  const [every, setEvery] = useState("1");

  return (
    <PdfToolShell tool={tool} onRun={() => tool.run([{ name: "every", value: every }])}>
      <label className="flex flex-col gap-1">
        <span>Pages per output file</span>
        <input
          type="number"
          min={1}
          inputMode="numeric"
          value={every}
          onChange={(event) => setEvery(event.target.value)}
          className="input"
        />
      </label>
      <p className="meta">
        A 7-page document split every 3 pages produces 3, 3, then 1 page. The result always comes
        back as a ZIP, even when it is a single part.
      </p>
    </PdfToolShell>
  );
}
