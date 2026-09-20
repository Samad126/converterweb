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
  {
    id: "form-fields",
    label: "Fill a form",
    blurb: "Read and fill a PDF's form fields.",
    route: "/pdf/form-fields",
  },
  { id: "compare", label: "Compare", blurb: "See what changed between two PDFs.", route: "/pdf/compare" },
  {
    id: "sign",
    label: "Sign",
    blurb: "Stamp a signature, initials or date onto a PDF.",
    route: "/pdf/sign",
  },
  { id: "merge", label: "Merge", blurb: "Combine several PDFs into one.", route: "/pdf/merge" },
  { id: "split", label: "Split", blurb: "Break a PDF into separate files.", route: "/pdf/split" },
  { id: "rotate", label: "Rotate", blurb: "Rotate one or more pages.", route: "/pdf/rotate" },
  {
    id: "watermark",
    label: "Watermark",
    blurb: "Stamp text or an image across every page.",
    route: "/pdf/watermark",
  },
  { id: "protect", label: "Protect", blurb: "Add a password to a PDF.", route: "/pdf/protect" },
  { id: "unlock", label: "Unlock", blurb: "Remove a PDF's password.", route: "/pdf/unlock" },
  {
    id: "organize",
    label: "Organize",
    blurb: "Reorder, rotate or delete pages.",
    route: "/pdf/organize",
  },
  { id: "crop", label: "Crop", blurb: "Trim a PDF's page margins.", route: "/pdf/crop" },
  { id: "edit", label: "Edit", blurb: "Add text, shapes or images to a page.", route: "/pdf/edit" },
  {
    id: "redact",
    label: "Redact",
    blurb: "Permanently black out sensitive content.",
    route: "/pdf/redact",
  },
  { id: "repair", label: "Repair", blurb: "Recover a damaged PDF.", route: "/pdf/repair" },
  {
    id: "extract-pages",
    label: "Extract pages",
    blurb: "Pull specific pages into a new PDF.",
    route: "/pdf/extract-pages",
  },
  {
    id: "remove-pages",
    label: "Remove pages",
    blurb: "Delete specific pages from a PDF.",
    route: "/pdf/remove-pages",
  },
  {
    id: "page-numbers",
    label: "Page numbers",
    blurb: "Stamp page numbers onto every page.",
    route: "/pdf/page-numbers",
  },
  {
    id: "scan-to-pdf",
    label: "Scan to PDF",
    blurb: "Turn one or more photos into a PDF.",
    route: "/pdf/scan-to-pdf",
  },
];
