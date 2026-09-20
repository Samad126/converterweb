"use client";

/**
 * `/pdf/repair` — read and rewrite a damaged PDF, fixing whatever the reader
 * can recover from. No fields of its own; refuses an encrypted file.
 */
import { PdfToolShell } from "@/components/PdfToolShell";
import { usePdfFileTool } from "@/lib/usePdfFileTool";

export function RepairTool(): React.ReactElement {
  const tool = usePdfFileTool("/pdf/repair");

  return <PdfToolShell tool={tool} onRun={() => tool.run()} />;
}
