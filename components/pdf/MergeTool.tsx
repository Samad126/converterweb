"use client";

/**
 * `/pdf/merge` — combine two or more PDFs into one, in upload order.
 *
 * The one tool (with `ScanToPdfTool`) that takes several files under one
 * repeated field name rather than a single `file`, so it uses
 * `usePdfMultiFileTool` and `PdfMultiToolShell` instead of the single-file
 * pair every other `/pdf/*` tool uses.
 */
import { PdfMultiToolShell } from "@/components/PdfMultiToolShell";
import { usePdfMultiFileTool } from "@/lib/usePdfMultiFileTool";

export function MergeTool(): React.ReactElement {
  const tool = usePdfMultiFileTool("/pdf/merge", { fieldName: "files", minFiles: 2 });

  return (
    <PdfMultiToolShell
      tool={tool}
      accept=".pdf"
      acceptedLabel=".pdf"
      hint="At least two PDFs. They are concatenated in the order listed below."
      onRun={() => tool.run()}
    />
  );
}
