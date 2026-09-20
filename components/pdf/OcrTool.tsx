"use client";

/**
 * `/pdf/ocr` — make a scanned PDF searchable.
 *
 * One option: `force`, a string `"true"`/`"false"` sent only when checked,
 * since the server's own default (`"false"`) already matches the checkbox's
 * resting state.
 */
import { useState } from "react";

import { PdfToolShell } from "@/components/PdfToolShell";
import { usePdfFileTool } from "@/lib/usePdfFileTool";

export function OcrTool(): React.ReactElement {
  const tool = usePdfFileTool("/pdf/ocr");
  const [force, setForce] = useState(false);

  return (
    <PdfToolShell
      tool={tool}
      onRun={() => tool.run(force ? [{ name: "force", value: "true" }] : [])}
    >
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={force}
          onChange={(event) => setForce(event.target.checked)}
        />
        Re-OCR unconditionally, even if the PDF already has real text
      </label>
    </PdfToolShell>
  );
}
