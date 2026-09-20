/**
 * The homepage's and `/pdf`'s task categories.
 *
 * Adobe's own redesign notes (cited in the Phase 2 research) are the reason
 * this file exists: a flat wall of 57 tools is worse than the same 57 tools
 * grouped by job-to-be-done. This is presentation grouping only — it invents
 * no route, no capability and no data. `Convert` doesn't enumerate all 36
 * catalog pairs (that's `/conversions`'s job); it shows `POPULAR` and points
 * at the index. The four PDF categories partition `PDF_TOOLS` exhaustively —
 * `tests/categories.test.ts` checks every id lands in exactly one group, so a
 * new tool silently missing a category fails the suite instead of the review.
 */
import { CATALOG, EXTRA_TOOLS, POPULAR } from "./catalog";
import { PDF_TOOLS } from "./pdfTools";

export interface CategoryItem {
  id: string;
  label: string;
  blurb: string;
  route: string;
}

export interface Category {
  id: string;
  label: string;
  lede: string;
  seeAllHref: string;
  seeAllLabel: string;
  items: readonly CategoryItem[];
}

function pdfTool(id: string): CategoryItem {
  const tool = PDF_TOOLS.find((t) => t.id === id);
  if (!tool || !tool.route) throw new Error(`categories: unknown or routeless PDF tool "${id}"`);
  return { id: tool.id, label: tool.label, blurb: tool.blurb, route: tool.route };
}

const MERGE_ORGANIZE_IDS = [
  "merge",
  "split",
  "organize",
  "rotate",
  "extract-pages",
  "remove-pages",
  "page-numbers",
  "crop",
  "repair",
  "compress",
  "watermark",
];

const PROTECT_SIGN_IDS = ["protect", "unlock", "sign", "form-fields"];

const EDIT_REDACT_IDS = ["edit", "redact", "compare", "ocr", "scan-to-pdf"];

export const CATEGORIES: readonly Category[] = [
  {
    id: "convert",
    label: "Convert",
    lede: "Turn one format into another — Word, Excel, PowerPoint, images and more.",
    seeAllHref: "/conversions",
    seeAllLabel: `All ${CATALOG.length} conversions`,
    items: POPULAR.map((entry) => ({
      id: entry.slug,
      label: entry.heading,
      blurb: entry.cardBlurb,
      route: `/${entry.slug}`,
    })),
  },
  {
    id: "merge-organize",
    label: "Merge & organize",
    lede: "Combine, split, reorder or repair a PDF's pages.",
    seeAllHref: "/pdf",
    seeAllLabel: "All PDF tools",
    items: MERGE_ORGANIZE_IDS.map(pdfTool),
  },
  {
    id: "protect-sign",
    label: "Protect & sign",
    lede: "Lock a PDF down, or add a signature and fill its fields.",
    seeAllHref: "/pdf",
    seeAllLabel: "All PDF tools",
    items: PROTECT_SIGN_IDS.map(pdfTool),
  },
  {
    id: "edit-redact",
    label: "Edit & redact",
    lede: "Change what's on the page, or compare two versions of it.",
    seeAllHref: "/pdf",
    seeAllLabel: "All PDF tools",
    items: EDIT_REDACT_IDS.map(pdfTool),
  },
  {
    id: "extract",
    label: "Extract",
    lede: "Pull specific content out of a file rather than converting the whole thing.",
    seeAllHref: "/pdf",
    seeAllLabel: "All PDF tools",
    items: EXTRA_TOOLS.map((tool) => ({
      id: tool.id,
      label: tool.label,
      blurb: `Accepts ${tool.extensions.join(", ")}.`,
      route: tool.route,
    })),
  },
];

/** Every `PDF_TOOLS` id assigned to a category — used to test exhaustiveness. */
export const CATEGORIZED_PDF_TOOL_IDS: readonly string[] = [
  ...MERGE_ORGANIZE_IDS,
  ...PROTECT_SIGN_IDS,
  ...EDIT_REDACT_IDS,
];
