/**
 * The catalog of `/pdf/*` tools — a much smaller cousin of `lib/catalog.ts`.
 *
 * There is no matrix to check this against: every tool here is unconditionally
 * available for any PDF (or, for `scan-to-pdf`, an image), so this is purely
 * routing and copy, never a claim about reachability.
 *
 * `route` is only set for a tool that has a page. The rest are named so the
 * index can say what is coming without linking anywhere yet — this is the one
 * list in the app that is allowed to be ahead of its own routes, since it
 * never promises a page it does not have; `PDF_TOOLS.find((t) => t.route)`
 * is what actually gates a link.
 */
export interface PdfTool {
  id: string;
  label: string;
  blurb: string;
  route: string | null;
}

export const PDF_TOOLS: readonly PdfTool[] = [
  { id: "ocr", label: "OCR", blurb: "Make a scanned PDF searchable.", route: "/pdf/ocr" },
  { id: "compress", label: "Compress", blurb: "Shrink a PDF's file size.", route: "/pdf/compress" },
  { id: "form-fields", label: "Fill a form", blurb: "Read and fill a PDF's form fields.", route: null },
  { id: "compare", label: "Compare", blurb: "See what changed between two PDFs.", route: null },
  { id: "sign", label: "Sign", blurb: "Stamp a signature, initials or date onto a PDF.", route: null },
  { id: "merge", label: "Merge", blurb: "Combine several PDFs into one.", route: null },
  { id: "split", label: "Split", blurb: "Break a PDF into separate files.", route: null },
  { id: "rotate", label: "Rotate", blurb: "Rotate one or more pages.", route: null },
  { id: "watermark", label: "Watermark", blurb: "Stamp text or an image across every page.", route: null },
  { id: "protect", label: "Protect", blurb: "Add a password to a PDF.", route: null },
  { id: "unlock", label: "Unlock", blurb: "Remove a PDF's password.", route: null },
  { id: "organize", label: "Organize", blurb: "Reorder, rotate or delete pages.", route: null },
  { id: "crop", label: "Crop", blurb: "Trim a PDF's page margins.", route: null },
  { id: "edit", label: "Edit", blurb: "Add text, shapes or images to a page.", route: null },
  { id: "redact", label: "Redact", blurb: "Permanently black out sensitive content.", route: null },
  { id: "repair", label: "Repair", blurb: "Recover a damaged PDF.", route: null },
  { id: "extract-pages", label: "Extract pages", blurb: "Pull specific pages into a new PDF.", route: null },
  { id: "remove-pages", label: "Remove pages", blurb: "Delete specific pages from a PDF.", route: null },
  { id: "page-numbers", label: "Page numbers", blurb: "Stamp page numbers onto every page.", route: null },
  { id: "scan-to-pdf", label: "Scan to PDF", blurb: "Turn one or more photos into a PDF.", route: null },
];
