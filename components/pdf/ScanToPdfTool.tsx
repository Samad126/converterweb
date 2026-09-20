"use client";

/**
 * `/pdf/scan-to-pdf` — build a PDF from a set of images, one page per image,
 * each page sized to its own image's pixel dimensions.
 */
import { PdfMultiToolShell } from "@/components/PdfMultiToolShell";
import { usePdfMultiFileTool } from "@/lib/usePdfMultiFileTool";

export function ScanToPdfTool(): React.ReactElement {
  const tool = usePdfMultiFileTool("/pdf/scan-to-pdf", { fieldName: "files", minFiles: 1 });

  return (
    <PdfMultiToolShell
      tool={tool}
      accept=".png,.jpg,.jpeg"
      acceptedLabel=".png, .jpg or .jpeg"
      hint="One or more photos. Each becomes a page, in the order listed below."
      onRun={() => tool.run()}
    />
  );
}
