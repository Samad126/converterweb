/**
 * The editorial layer: which conversion pages exist, and what they say.
 *
 * ---------------------------------------------------------------------------
 * Why this is not the "hard-coded matrix" that `lib/converter/formats.ts` forbids
 * ---------------------------------------------------------------------------
 *
 * `lib/converter/formats.ts` says, in as many words, that there must never be a table of
 * the conversion matrix in this app, and `tests/content/matrix.test.tsx` exists to keep
 * that true. This file is not that table, and the distinction is worth being
 * precise about, because it is the sort of thing that erodes.
 *
 * The rule exists so that the app can never *claim a capability the server does
 * not have*. Nothing here claims one. This file decides two things and only two:
 * which URLs exist, and what prose they carry. Whether a conversion is actually
 * possible is still answered, at runtime and on every page, by `GET /formats` —
 * through `findSource`, `isReachable` and `unreachableReason`, exactly as before.
 *
 * Three things keep it honest:
 *
 *   1. `target` is a `TargetId`, generated from `openapi.json` into
 *      `lib/api/contract.ts`. Naming a target the contract does not define is a
 *      compile error, not a page that 404s.
 *   2. Each entry is a *preset*, never a lock. The page hands its target to
 *      `useConverter` as the starting selection; if the live matrix disagrees,
 *      the existing picker already shows that target disabled and explains why,
 *      in the server's own words. The page degrades to the truth.
 *   3. Every source extension named here is checked against the matrix in
 *      `tests/content/catalog.test.tsx`. Adding a page for a pair the service cannot
 *      perform fails the suite.
 *
 * The one thing that must not happen is a page for a conversion that does not
 * exist. PDF **used to** never be a source — an earlier version of the
 * service had no `.pdf` entry in `SOURCES` at all — but the service now
 * extracts a PDF's own content back out (`pdf_to_docx` and its siblings,
 * below), so that is no longer an invariant this file enforces. What is
 * still true: PDF never converts to itself, and a PDF's own pages
 * (`word_to_pdf` and so on) still only ever *produce* PDF, never accept one.
 *
 * ---------------------------------------------------------------------------
 * How the prose is composed
 * ---------------------------------------------------------------------------
 *
 * Copy is assembled from a source group, a target note and a pair-specific
 * sentence rather than written out 36 times. That is not only for brevity: it
 * means a fact that is true of every Word conversion (the three extensions that
 * import identically) or of every image target (the ZIP) is stated once and
 * cannot drift between pages. The pair sentence is what stops the pages being
 * duplicates of each other, so it is required, not optional.
 */
import { ARCHIVE_EXTENSION } from "../constants";
import type { TargetId } from "../api/contract";

/**
 * The LibreOffice document families, as the service reports them per source.
 *
 * Reused verbatim from `GET /formats` rather than invented here, so the
 * homepage's filter pills group pages the same way the converter groups files.
 */
export type Family = "writer" | "calc" | "impress" | "draw";

/** The family's name as a person would say it, for pills and section headings. */
export const FAMILY_LABELS: Readonly<Record<Family, string>> = {
  writer: "Documents",
  calc: "Spreadsheets",
  impress: "Presentations",
  draw: "Images",
};

/**
 * A group of source extensions that share one product name.
 *
 * The grouping is the point of the URL scheme: `.docx`, `.doc` and `.docm` all
 * import through the same Writer filter and can reach exactly the same targets,
 * so three pages would be three near-identical pages competing for one query.
 * `tests/content/catalog.test.tsx` asserts the grouping is lossless — that every
 * extension in a group really does reach every target the group advertises.
 */
export interface SourceGroup {
  /** The URL fragment: `word` in `word_to_pdf`. */
  key: string;
  /** The product name, as searched for: "Word", "PowerPoint". */
  label: string;
  /** The plural noun for prose: "Word documents". */
  noun: string;
  /** Every extension this page accepts. */
  extensions: readonly string[];
  /**
   * `undefined` for a source the service handles with its own code rather
   * than LibreOffice — `GET /formats` reports `family: null` for these (see
   * `lib/api/contract.ts`'s note on the same field). The markup-conversion group
   * below is the one user of this: pandoc has no notion of the LibreOffice
   * families, so there is nothing honest to put here.
   */
  family?: Family;
  /** The monogram drawn in the card's badge. */
  badge: string;
  /** One sentence about the format, reused across its pages. */
  blurb: string;
}

/** What a target is called, and the two sentences worth saying about it. */
export interface TargetNote {
  label: string;
  badge: string;
  /** What you get, in one sentence. Used in prose. */
  promise: string;
  /**
   * A short clause for a meta description, where there is a hard character
   * budget and `promise` does not fit.
   */
  metaNote: string;
  /**
   * The honest caveat: what this export does not carry across. Every target has
   * one, because "converts perfectly" is not a claim this service makes and
   * pretending otherwise produces a support burden rather than a page.
   */
  caveat: string;
}

/**
 * The document-family targets this file owns prose for.
 *
 * `TargetId` now also carries the archive, subtitle, data-interchange and
 * raster-image targets that `lib/imageCatalog.ts`, `lib/archiveCatalog.ts`,
 * `lib/subtitleCatalog.ts` and `lib/dataCatalog.ts` own instead — each of
 * those is its own family with its own route prefix and its own exhaustive
 * table, mirroring `lib/media/mediaCatalog.ts`. Narrowing to `DocTargetId` here
 * keeps this file's exhaustiveness check scoped to the family it actually
 * writes prose for, rather than forcing every new family through one
 * ever-growing table.
 */
export type DocTargetId = Extract<
  TargetId,
  | "pdf"
  | "odt"
  | "docx"
  | "txt"
  | "html"
  | "rtf"
  | "epub"
  | "ods"
  | "xlsx"
  | "csv"
  | "odp"
  | "pptx"
  | "png"
  | "jpg"
  | "tables"
  | "layers"
  | "pdfa"
  | "markdown"
>;

/**
 * Every target the document family can produce, with its prose.
 *
 * Exhaustive on purpose. `DocTargetId` is derived from the generated
 * contract, so adding a document-family format to the service and
 * regenerating the types makes this object fail to compile — which is the
 * correct moment to decide what the new page says, and is exactly the
 * "loudly, at compile time" the rest of this app aims for.
 */
export const TARGETS: Readonly<Record<DocTargetId, TargetNote>> = {
  pdf: {
    label: "PDF",
    badge: "PDF",
    promise:
      "a single PDF with a fixed layout, which opens identically on a machine that has never heard of the software that made it",
    metaNote: "A fixed-layout PDF that opens the same everywhere.",
    caveat:
      "The PDF is produced by LibreOffice's export filter, so a document that leans on unusual fonts or complex embedded objects may shift slightly. Nothing reflows, which is the point of a PDF.",
  },
  docx: {
    label: "DOCX",
    badge: "DOCX",
    promise: "an editable Word document",
    metaNote: "An editable Word document.",
    caveat:
      "Headings, lists, tables and basic character formatting come across. Where the original used features Word has no equivalent for, expect them to be simplified rather than lost.",
  },
  odt: {
    label: "ODT",
    badge: "ODT",
    promise:
      "an editable OpenDocument file, the native format of LibreOffice Writer and one that Google Docs and most office suites open without a translator",
    metaNote: "An editable OpenDocument file for LibreOffice.",
    caveat:
      "ODT is an open, ISO-standardised format. It reproduces the document's structure faithfully; the difference you are most likely to notice is font substitution, since the reader supplies the fonts.",
  },
  txt: {
    label: "TXT",
    badge: "TXT",
    promise: "plain text, UTF-8 encoded, with no styling at all",
    metaNote: "UTF-8 plain text with no styling.",
    caveat:
      "Only the words survive. Headings, tables, images, footnotes and emphasis are all dropped, and the text is always written as UTF-8 regardless of what the original used.",
  },
  html: {
    label: "HTML",
    badge: "HTML",
    promise: "a single HTML file you can open in a browser or drop onto a site",
    metaNote: "A single HTML file.",
    caveat:
      "Headings, lists, tables and emphasis become HTML elements. The styling is the export's own, not your original template's, so a heavily designed document will arrive plainer than it left.",
  },
  rtf: {
    label: "RTF",
    badge: "RTF",
    promise: "a Rich Text Format document, which almost any word processor opens",
    metaNote: "Rich text that almost any word processor opens.",
    caveat:
      "RTF carries basic styling well but nothing modern — no themes, no embedded spreadsheets, no advanced layout. Its value is reach, not fidelity.",
  },
  epub: {
    label: "EPUB",
    badge: "EPUB",
    promise: "an EPUB e-book for a reader such as Kobo, Apple Books or a phone",
    metaNote: "An EPUB e-book for e-readers.",
    caveat:
      "EPUB reflows: the text is re-laid-out to fit the screen, so page breaks and precise positioning do not survive by design. It suits a manuscript that flows continuously far better than a fixed layout with columns or text boxes.",
  },
  ods: {
    label: "ODS",
    badge: "ODS",
    promise: "an editable OpenDocument spreadsheet",
    metaNote: "An editable OpenDocument spreadsheet.",
    caveat:
      "Values, formulas and sheet structure carry across. Charts and pivot tables can be simplified, since the two spreadsheet formats do not describe them in the same way.",
  },
  xlsx: {
    label: "XLSX",
    badge: "XLSX",
    promise: "an editable Excel workbook",
    metaNote: "An editable Excel workbook.",
    caveat:
      "Values, formulas and sheet structure carry across. Charts and pivot tables can be simplified, since the two spreadsheet formats do not describe them in the same way.",
  },
  csv: {
    label: "CSV",
    badge: "CSV",
    promise: "comma-separated values, UTF-8 encoded, with fields quoted",
    metaNote: "UTF-8 comma-separated values.",
    caveat:
      "A CSV describes one flat table, so a workbook with several sheets exports one of them, and formatting is lost entirely. Cells are written as displayed, so a formula arrives as its result rather than as a formula.",
  },
  odp: {
    label: "ODP",
    badge: "ODP",
    promise: "an editable OpenDocument presentation",
    metaNote: "An editable OpenDocument presentation.",
    caveat:
      "Slides, text and images carry across. Animation and transition effects may not survive the trip, because the two presentation formats do not model them identically.",
  },
  pptx: {
    label: "PPTX",
    badge: "PPTX",
    promise: "an editable PowerPoint presentation",
    metaNote: "An editable PowerPoint presentation.",
    caveat:
      "Slides, text and images carry across. Animation and transition effects may not survive the trip, because the two presentation formats do not model them identically.",
  },
  png: {
    label: "PNG",
    badge: "PNG",
    promise: `a ZIP archive holding one PNG image per page`,
    metaNote: `A ZIP holding one PNG per page.`,
    caveat:
      "There is no single-image output, and that is deliberate — a ZIP is what comes back even for a one-page source, so the response never changes shape depending on how many pages your file happened to have. PNG is lossless, which makes it the better choice for text on a slide and the larger one for photographs.",
  },
  jpg: {
    label: "JPG",
    badge: "JPG",
    promise: `a ZIP archive holding one JPEG image per page`,
    metaNote: `A ZIP holding one JPEG per page.`,
    caveat:
      "There is no single-image output, and that is deliberate — a ZIP is what comes back even for a one-page source, so the response never changes shape depending on how many pages your file happened to have. JPEG is lossy and much lighter than PNG, which suits photographs more than fine text.",
  },
  tables: {
    label: "XLSX (tables)",
    badge: "XLSX",
    promise:
      "an Excel workbook holding only the tables the source document contains, one sheet per table, with none of the surrounding prose",
    metaNote: "An Excel workbook of just the document's tables.",
    caveat:
      "This is not a full document export: paragraphs, headings and images outside a table are dropped on purpose, so the workbook stays a workbook rather than a document wearing a spreadsheet's extension. A source with no tables at all produces an empty workbook rather than an error.",
  },
  layers: {
    label: "PNG (layers)",
    badge: "PNG",
    promise:
      "a ZIP archive holding one PNG per layer of the source file, at the path its group gives it, plus a manifest describing every layer",
    metaNote: "A ZIP of one PNG per layer, with a manifest.",
    caveat:
      "A layer that produces no image of its own — an empty group, an adjustment layer, anything with nothing to rasterise — is still named in the manifest, along with why it has no file, rather than silently missing from the archive.",
  },
  pdfa: {
    label: "PDF/A",
    badge: "PDF/A",
    promise:
      "a PDF/A file: the archival variant of PDF, with fonts embedded and anything that depends on an external resource or a live connection disallowed",
    metaNote: "An archival PDF/A, built for long-term storage.",
    caveat:
      "PDF/A trades a little flexibility for the guarantee that the file still opens correctly in decades: no encryption, no embedded audio or video, no JavaScript. A document leaning on any of those is flattened or stripped rather than failed outright.",
  },
  markdown: {
    label: "Markdown",
    badge: "MD",
    promise: "a Markdown file using GitHub-flavoured syntax for headings, lists, tables and emphasis",
    metaNote: "GitHub-flavoured Markdown.",
    caveat:
      "Markdown has no notion of fonts, colour or precise layout, so only structure survives — headings, lists, tables, links and basic emphasis. Images are referenced, not embedded, since Markdown has no way to carry binary data inline.",
  },
};

/**
 * The one-line benefit shown on a grid card.
 *
 * Separate from `TargetNote` because it answers a different question. `promise`
 * is for someone already reading the page ("what exactly will I get"); this is
 * for someone scanning sixty-seven cards, and has to be readable at a glance in a
 * column about a third of the page wide.
 *
 * Keyed by target alone, deliberately. The card's title already carries the
 * source — "Word to PDF" — so repeating it in the description would be three
 * lines saying one thing. Exhaustive, like `TARGETS`, for the same reason.
 */
const CARD_LEADS: Readonly<Record<DocTargetId, string>> = {
  pdf: "A fixed layout that looks the same on every device",
  docx: "Editable in Word, with the formatting intact",
  odt: "Editable in LibreOffice, Google Docs and anything open",
  txt: "Just the words, with no markup in the way",
  html: "A page you can open in any browser",
  rtf: "Rich text that almost any word processor opens",
  epub: "An e-book you can read on a dedicated reader",
  ods: "Editable in LibreOffice Calc",
  xlsx: "Editable in Excel",
  csv: "Raw values, ready to import somewhere else",
  odp: "Editable in LibreOffice Impress",
  pptx: "Editable in PowerPoint",
  png: "One lossless PNG per page, in a ZIP",
  jpg: "One JPEG per page, in a ZIP",
  tables: "Just the tables, as sheets in a workbook",
  layers: "One PNG per layer, in a ZIP with a manifest",
  pdfa: "An archival PDF built to still open in decades",
  markdown: "Structure only, as GitHub-flavoured Markdown",
};

/**
 * The source groups, in the order they appear on the homepage and in the
 * sitemap. Roughly: the formats people arrive with, most common first.
 */
export const SOURCES: readonly SourceGroup[] = [
  {
    key: "word",
    label: "Word",
    noun: "Word documents",
    extensions: [".docx"],
    family: "writer",
    badge: "W",
    blurb: "The modern Word format. Read directly, with no filter to translate through.",
  },
  {
    // `.doc`, `.docm`, `.dot` and `.dotx` are grouped separately from `.docx`
    // rather than folded into it, because they genuinely behave differently:
    // each of them can reach `docx` as an extra target (an upgrade to the
    // modern format), which `.docx` itself obviously cannot. Folding them
    // together would make the group's own "identical targets" test fail for
    // the right reason — this is a real difference, not an oversight.
    key: "doc",
    label: "Word (legacy)",
    noun: "older Word documents",
    extensions: [".doc", ".docm", ".dot", ".dotx"],
    family: "writer",
    badge: "W",
    blurb:
      "The older .doc format, macro-enabled .docm, and the .dot/.dotx template variants. Macros are not carried into the output.",
  },
  {
    key: "excel",
    label: "Excel",
    noun: "Excel spreadsheets",
    extensions: [".xlsx"],
    family: "calc",
    badge: "X",
    blurb:
      "Modern Excel workbooks. Values, formulas and sheet structure are read directly.",
  },
  {
    // Same reasoning as `.doc`'s group: `.xls`/`.xlsm` can reach `xlsx` as an
    // extra target, which `.xlsx` itself cannot.
    key: "xls",
    label: "Excel (legacy)",
    noun: "older Excel spreadsheets",
    extensions: [".xls", ".xlsm"],
    family: "calc",
    badge: "X",
    blurb: "The older .xls format and macro-enabled .xlsm.",
  },
  {
    key: "powerpoint",
    label: "PowerPoint",
    noun: "PowerPoint presentations",
    extensions: [".pptx"],
    family: "impress",
    badge: "P",
    blurb: "PowerPoint decks, read one slide at a time.",
  },
  {
    // Same reasoning again: these can reach `pptx` as an extra target.
    key: "ppt",
    label: "PowerPoint (legacy)",
    noun: "older PowerPoint decks",
    extensions: [".ppt", ".pptm", ".pps", ".ppsx", ".pot", ".potx"],
    family: "impress",
    badge: "P",
    blurb:
      "The older .ppt format, macro-enabled .pptm, the slideshow variants .pps/.ppsx, and the template variants .pot/.potx.",
  },
  {
    key: "jpg",
    label: "JPG",
    noun: "JPG images",
    extensions: [".jpg", ".jpeg"],
    family: "draw",
    badge: "JPG",
    blurb: "JPEG photographs and scans. Both spellings of the extension work.",
  },
  {
    key: "png",
    label: "PNG",
    noun: "PNG images",
    extensions: [".png"],
    family: "draw",
    badge: "PNG",
    blurb: "PNG images — screenshots, charts and anything lossless.",
  },
  {
    key: "odt",
    label: "ODT",
    noun: "ODT documents",
    extensions: [".odt"],
    family: "writer",
    badge: "ODT",
    blurb: "LibreOffice Writer's native format, and the open standard for text.",
  },
  {
    key: "ods",
    label: "ODS",
    noun: "ODS spreadsheets",
    extensions: [".ods"],
    family: "calc",
    badge: "ODS",
    blurb: "LibreOffice Calc's native spreadsheet format.",
  },
  {
    key: "odp",
    label: "ODP",
    noun: "ODP presentations",
    extensions: [".odp"],
    family: "impress",
    badge: "ODP",
    blurb: "LibreOffice Impress's native presentation format.",
  },
  {
    key: "csv",
    label: "CSV",
    noun: "CSV files",
    extensions: [".csv"],
    family: "calc",
    badge: "CSV",
    blurb: "Comma-separated values — the format everything exports and nothing edits.",
  },
  {
    key: "txt",
    label: "TXT",
    noun: "plain text files",
    extensions: [".txt"],
    family: "writer",
    badge: "TXT",
    blurb: "Plain UTF-8 text, with no markup to interpret.",
  },
  {
    key: "html",
    label: "HTML",
    noun: "HTML files",
    extensions: [".html", ".htm"],
    family: "writer",
    badge: "HTML",
    blurb:
      "Web pages saved as files. Both .html and .htm work. The file is converted as it is on disk — the service does not fetch the live page or pull in stylesheets and images from the internet.",
  },
  {
    key: "rtf",
    label: "RTF",
    noun: "RTF documents",
    extensions: [".rtf"],
    family: "writer",
    badge: "RTF",
    blurb: "Rich Text Format — the interchange format that predates them all and still opens.",
  },
  {
    // PDF as a *source* — the exception to the invariant this file used to
    // hold ("PDF is never an input"), now that the service can extract a
    // PDF's content back out. It is still never reachable from PDF *to*
    // PDF, and it is still never the thing PDF pages themselves accept —
    // this is its own, separate direction.
    key: "pdf",
    label: "PDF",
    noun: "PDF files",
    extensions: [".pdf"],
    family: "draw",
    badge: "PDF",
    blurb:
      "A PDF, read back out rather than only produced. Extraction quality depends on how the PDF was made: one exported from Word or Google Docs carries real structure across; a PDF that is a scan of a page has none to extract, and OCR is a separate tool for that case.",
  },
  {
    key: "odg",
    label: "ODG",
    noun: "ODG drawings",
    extensions: [".odg"],
    family: "draw",
    badge: "ODG",
    blurb: "LibreOffice Draw's native vector-drawing format.",
  },
  {
    // No `family`: pandoc handles these, not LibreOffice, and `GET /formats`
    // reports `family: null` for every one of them. See `SourceGroup.family`.
    key: "markup",
    label: "Markdown & markup",
    noun: "plain-text markup files",
    extensions: [".md", ".rst", ".tex", ".textile", ".org", ".opml", ".muse", ".ipynb"],
    badge: "MD",
    blurb:
      "Eight plain-text markup dialects — Markdown, reStructuredText, LaTeX, Textile, Org mode, OPML outlines, Muse and Jupyter notebooks — all read by the same engine (pandoc) and all reaching the same targets.",
  },
];

/**
 * The pair-specific sentence.
 *
 * `slug → [sourceKey, targetId, angle]`. The slug is derived from the first two
 * rather than written out, so a slug can never disagree with the pair it names.
 *
 * `angle` is what makes each page worth indexing on its own. It must say
 * something true of *this* pair and not of its neighbours — if two entries could
 * swap sentences without either becoming wrong, one of them is filler.
 */
const PAIRS: ReadonlyArray<readonly [source: string, target: DocTargetId, angle: string]> = [
  // ---------------------------------------------------------------- Word
  [
    "word",
    "pdf",
    "The commonest reason to be here: a Word file that has to arrive looking the same on somebody else's machine. A PDF cannot be reflowed by an unfamiliar font, and the person receiving it does not need Word — or any office suite — to open it.",
  ],
  [
    "word",
    "odt",
    "The move to an open, ISO-standardised format that LibreOffice, Google Docs and most office suites read natively. Worth doing when a document has to outlive a software licence.",
  ],
  [
    "word",
    "txt",
    "Strips a document back to its words. This is what you want before pasting into a database, a script or a form field, where markup is not just useless but actively in the way.",
  ],
  [
    "word",
    "html",
    "Turns a document into a web page, with headings, lists and emphasis carried across as HTML elements rather than as styling.",
  ],
  [
    "word",
    "rtf",
    "The middle ground between .docx and plain text: rich enough to keep basic formatting, old enough that software from two decades ago can still open it.",
  ],
  [
    "word",
    "epub",
    "Reflows a document into an e-book. It works best with a manuscript that flows continuously; a heavily designed layout with columns or text boxes has more to lose when the text is re-laid-out to fit a screen.",
  ],

  // ----------------------------------------------------------------- ODT
  [
    "odt",
    "pdf",
    "LibreOffice's own format, exported by LibreOffice's own PDF filter — the shortest path in this whole service, and the one with the least room to lose anything on the way out.",
  ],
  [
    "odt",
    "docx",
    "Hand a LibreOffice document to somebody working in Word. The two formats are close relatives, so headings, lists, tables and basic styling come across with little to explain.",
  ],

  // --------------------------------------------------------------- Excel
  [
    "excel",
    "pdf",
    "Freeze a spreadsheet into a document anyone can read without Excel — the right shape for an invoice, a report or a printed schedule, and the only shape that stops a recipient re-sorting your numbers.",
  ],
  [
    "excel",
    "ods",
    "Move a workbook to the open spreadsheet format, so it opens in LibreOffice, Google Sheets and anything else without a proprietary reader.",
  ],
  [
    "excel",
    "csv",
    "Reduce a workbook to its raw values for import somewhere else. Cells are written as displayed, so a formula arrives as its result and not as a formula.",
  ],
  [
    "excel",
    "html",
    "Publish a sheet as an HTML table you can paste into a page or an email, where it renders as a table without anyone needing a spreadsheet application.",
  ],

  // ----------------------------------------------------------------- ODS
  [
    "ods",
    "pdf",
    "A fixed-layout PDF out of a LibreOffice spreadsheet: numbers that cannot be re-sorted, re-formatted or edited by whoever receives them.",
  ],
  [
    "ods",
    "xlsx",
    "Move a LibreOffice spreadsheet into Excel's format for a colleague or a system that expects Microsoft Office.",
  ],

  // ---------------------------------------------------------- PowerPoint
  [
    "powerpoint",
    "pdf",
    "Share a deck that opens exactly as designed — on any machine, without PowerPoint and without the fonts it was built with. This is the safe way to send a presentation to somebody who only has to read it.",
  ],
  [
    "powerpoint",
    "odp",
    "Move a deck into the open ODP format that LibreOffice Impress edits natively.",
  ],
  [
    "powerpoint",
    "png",
    "Every slide as a lossless PNG. This is the choice when a slide contains text or line art you want to stay crisp; you get back a ZIP with one image per slide, not a single picture.",
  ],
  [
    "powerpoint",
    "jpg",
    "Every slide as a JPEG. Lighter than PNG and the better choice for photographic slides or anywhere the file size matters. Delivered as a ZIP, one image per slide.",
  ],

  // ----------------------------------------------------------------- ODP
  [
    "odp",
    "pdf",
    "Export a LibreOffice deck to PDF, where the layout is fixed and nothing depends on the reader having Impress installed.",
  ],
  [
    "odp",
    "pptx",
    "Move an ODP deck into PowerPoint's format so somebody on Microsoft Office can open it and, if they need to, edit it.",
  ],
  [
    "odp",
    "png",
    "One lossless PNG per slide, in a ZIP — a quick way to get deck pages into a document, a website or a design tool.",
  ],
  [
    "odp",
    "jpg",
    "One JPEG per slide, in a ZIP. Lighter than PNG, which matters on an image-heavy deck.",
  ],

  // ----------------------------------------------------------------- CSV
  [
    "csv",
    "xlsx",
    "Give a CSV file a real spreadsheet: typed columns, several sheets, formatting and formulas. This is the usual first step after exporting data out of another system.",
  ],
  [
    "csv",
    "ods",
    "Import a CSV into LibreOffice Calc's native format, so the columns keep their types the next time you open it.",
  ],
  [
    "csv",
    "pdf",
    "Turn a table into a readable document — the quickest way to share tabular data with somebody who does not want a spreadsheet, and does not want to be trusted with one.",
  ],
  [
    "csv",
    "html",
    "Publish a CSV as an HTML table you can paste into a page or an email, where it renders as a table without anyone needing a spreadsheet application.",
  ],

  // ----------------------------------------------------------------- TXT
  [
    "txt",
    "pdf",
    "Give a plain text file a fixed layout: real pages, predictable line breaks, and a document that prints the same everywhere.",
  ],
  [
    "txt",
    "docx",
    "Move plain text into Word, where you can add the styling, headers and structure it has been doing without.",
  ],
  [
    "txt",
    "odt",
    "Plain text into a LibreOffice Writer document, ready to be formatted.",
  ],

  // ---------------------------------------------------------------- HTML
  [
    "html",
    "pdf",
    "Capture a web page as a document — useful for an invoice, a receipt or a confirmation page, none of which stay put. What you save as a file is what gets converted, so if the design matters, save the page complete first.",
  ],
  [
    "html",
    "docx",
    "Open an HTML file as an editable Word document, keeping headings, lists and emphasis as real Word formatting.",
  ],
  [
    "html",
    "odt",
    "Bring a web page into LibreOffice Writer as editable text, with its structure intact.",
  ],

  // ----------------------------------------------------------------- RTF
  [
    "rtf",
    "docx",
    "Move an old RTF document into the modern Word format, without retyping it.",
  ],
  [
    "rtf",
    "pdf",
    "Freeze an RTF document as a PDF that opens identically everywhere, including on machines with no word processor at all.",
  ],
  [
    "rtf",
    "odt",
    "RTF into LibreOffice Writer's native format, for continued editing.",
  ],

  // ----------------------------------------------------------- Images
  [
    "png",
    "pdf",
    "Put an image into a document — the standard way to send a scan, a screenshot or a chart as something that prints predictably, keeps its page size, and cannot be edited by accident.",
  ],
  [
    "jpg",
    "pdf",
    "A photograph or a scan into a PDF with a fixed page size. Useful when a picture has to be a document: an ID, a receipt, a signed page.",
  ],

  // ------------------------------------------------------ Word (legacy)
  [
    "doc",
    "pdf",
    "Freeze an old .doc file — or a .dot/.dotx template — as a PDF that opens identically everywhere, including on a machine with no Word installed at all.",
  ],
  [
    "doc",
    "docx",
    "Bring an old .doc file into the modern Word format, so it opens without the compatibility warning and edits the way current Word expects.",
  ],
  [
    "doc",
    "odt",
    "Move an old Word document into LibreOffice Writer's open, ISO-standardised format.",
  ],
  [
    "doc",
    "txt",
    "Strip an old Word document back to its words, for pasting into a database, a script or a form field where markup only gets in the way.",
  ],
  [
    "doc",
    "html",
    "Turn an old Word document into a web page, with headings, lists and emphasis carried across as HTML elements.",
  ],
  [
    "doc",
    "rtf",
    "The middle ground for an old Word document: rich enough to keep basic formatting, plain enough that decades-old software can still open it.",
  ],
  [
    "doc",
    "epub",
    "Reflow an old Word document into an e-book, ready for a Kobo, Apple Books or a phone.",
  ],

  // ----------------------------------------------------- Excel (legacy)
  [
    "xls",
    "pdf",
    "Freeze an old .xls or macro-enabled .xlsm workbook into a document nobody can re-sort or re-format.",
  ],
  [
    "xls",
    "xlsx",
    "Move an old .xls workbook into the modern Excel format it has been overdue for.",
  ],
  [
    "xls",
    "ods",
    "Move an old Excel workbook to the open spreadsheet format, so it opens in LibreOffice and Google Sheets without a proprietary reader.",
  ],
  [
    "xls",
    "csv",
    "Reduce an old workbook to its raw values for import somewhere else. Formulas arrive as their results, not as formulas.",
  ],
  [
    "xls",
    "html",
    "Publish an old workbook's sheet as an HTML table, without anyone needing Excel to read it.",
  ],

  // -------------------------------------------------- PowerPoint (legacy)
  [
    "ppt",
    "pdf",
    "Share an old deck exactly as designed, on any machine, without PowerPoint or the fonts it was built with.",
  ],
  [
    "ppt",
    "pptx",
    "Move an old .ppt deck — or a .pps/.pot slideshow or template — into the modern PowerPoint format.",
  ],
  [
    "ppt",
    "odp",
    "Move an old deck into the open ODP format that LibreOffice Impress edits natively.",
  ],
  [
    "ppt",
    "png",
    "Every slide of an old deck as a lossless PNG, delivered as a ZIP with one image per slide.",
  ],
  [
    "ppt",
    "jpg",
    "Every slide of an old deck as a JPEG — lighter than PNG, and the better choice for photographic slides.",
  ],

  // ------------------------------------------------------------ ODG
  [
    "odg",
    "pdf",
    "Export a LibreOffice Draw vector drawing to a fixed-layout PDF that opens without Draw installed.",
  ],

  // ------------------------------------------------------------ PDF
  [
    "pdf",
    "docx",
    "Pull a PDF's text back into an editable Word document. Works best on a PDF that was exported from a word processor in the first place; a scanned page has no text layer to extract, and needs OCR first.",
  ],
  [
    "pdf",
    "pptx",
    "Turn a PDF back into an editable PowerPoint deck, one page per slide.",
  ],
  [
    "pdf",
    "xlsx",
    "Pull a PDF's tables back into an editable Excel workbook, one table per sheet.",
  ],
  [
    "pdf",
    "markdown",
    "Extract a PDF's structure — headings, lists, tables and emphasis — as GitHub-flavoured Markdown, with none of the fixed-layout formatting.",
  ],
  [
    "pdf",
    "png",
    "Every page of a PDF as a lossless PNG, delivered as a ZIP with one image per page.",
  ],
  [
    "pdf",
    "jpg",
    "Every page of a PDF as a JPEG — lighter than PNG, and the better choice when the page count is the point rather than the fine detail.",
  ],
  [
    "pdf",
    "pdfa",
    "Convert an ordinary PDF into PDF/A, the archival variant built to still open correctly in decades.",
  ],

  // --------------------------------------------------------- Markup
  [
    "markup",
    "docx",
    "Turn a plain-text markup file into an editable Word document, with headings, lists and emphasis as real Word formatting.",
  ],
  [
    "markup",
    "html",
    "Render a plain-text markup file as a web page you can open in any browser.",
  ],
  [
    "markup",
    "odt",
    "Bring a plain-text markup file into LibreOffice Writer as an editable document, structure intact.",
  ],
  [
    "markup",
    "rtf",
    "Turn a plain-text markup file into Rich Text Format, which almost any word processor opens.",
  ],
  [
    "markup",
    "txt",
    "Strip a plain-text markup file down to its words, with every heading, list marker and emphasis symbol removed.",
  ],
];

/** One conversion page. */
export interface ConversionEntry {
  /** The URL: `word_to_pdf`. */
  slug: string;
  source: SourceGroup;
  target: DocTargetId;
  /** Short labels, e.g. "Word" and "PDF". */
  sourceLabel: string;
  targetLabel: string;
  /** The monogram drawn in the badge for the target side of the pair. */
  targetBadge: string;
  /** `Word to PDF` — the `<h1>` and the head of the `<title>`. */
  heading: string;
  /** The phrase people actually search, e.g. "Word to PDF". */
  searchPhrase: string;
  /** The `<title>`, without the site-name template applied by `app/layout.tsx`. */
  title: string;
  /** The meta description. Kept under 160 characters. */
  description: string;
  /** The paragraph under the `<h1>`. */
  lede: string;
  /** The one-line benefit on a grid card. */
  cardBlurb: string;
  /** The pair-specific sentence, from `PAIRS`. */
  angle: string;
  /** What to expect, as a short list of facts true of this pair. */
  expect: readonly string[];
  faqs: readonly { question: string; answer: string }[];
}

/** `word_to_pdf` — derived, never written by hand. */
export function slugFor(sourceKey: string, target: DocTargetId): string {
  return `${sourceKey}_to_${target}`;
}

/** The accepted extensions, as a sentence fragment: ".docx, .doc and .docm". */
function extensionList(extensions: readonly string[]): string {
  if (extensions.length <= 1) return extensions[0] ?? "";
  return `${extensions.slice(0, -1).join(", ")} and ${extensions[extensions.length - 1]}`;
}

/** The other targets this source group can reach — the page's internal links. */
function siblings(entry: { source: SourceGroup; target: DocTargetId }): TargetNote[] {
  return PAIRS.filter(([key, target]) => key === entry.source.key && target !== entry.target).map(
    ([, target]) => TARGETS[target],
  );
}

/**
 * Everything a page needs, composed from the three tables above.
 *
 * Exported as a function as well as applied below, because the composition is
 * what the tests exercise — a change to how copy is assembled should not require
 * a page to be rendered to notice.
 */
export function composeEntry(
  source: SourceGroup,
  target: DocTargetId,
  angle: string,
): ConversionEntry {
  const note = TARGETS[target];
  const heading = `${source.label} to ${note.label}`;
  const accepted = extensionList(source.extensions);
  const others = siblings({ source, target });

  return {
    slug: slugFor(source.key, target),
    source,
    target,
    sourceLabel: source.label,
    targetLabel: note.label,
    targetBadge: note.badge,
    heading,
    searchPhrase: heading,
    title: `${heading} — Free Online Converter`,
    // Composed rather than written 36 times, so the promise and the privacy
    // sentence say the same thing on every page. Measured in tests, not by eye.
    description: `Convert ${source.noun} to ${note.label} free online. ${note.metaNote} No sign-up, up to 25 MB, and no file left on the server.`,
    lede: `Convert ${source.noun} to ${note.label} in the browser: you get ${note.promise}. Nothing to install, no account to make, and the file comes straight back.`,
    cardBlurb: `${CARD_LEADS[target]}.`,
    angle,
    expect: [
      `Files accepted: ${accepted} — up to 25 MB each.`,
      note.caveat,
      source.blurb,
      ...(others.length > 0
        ? [
            `The same file also converts to ${others
              .map((other) => other.label)
              .join(", ")}.`,
          ]
        : []),
    ],
    faqs: [
      {
        question: `Which files can I convert to ${note.label}?`,
        answer: `${source.noun.charAt(0).toUpperCase()}${source.noun.slice(1)}: ${accepted}. Up to 25 MB each. Anything else is refused before it is uploaded, so a wrong file costs you nothing.`,
      },
      {
        question: `What does the ${note.label} output look like?`,
        answer: `You get ${note.promise}. ${note.caveat}`,
      },
      ...(target === "png" || target === "jpg"
        ? [
            {
              question: `Why do I get a ${ARCHIVE_EXTENSION.slice(1)} file instead of one image?`,
              answer: `Because a document can have more than one page. You get a ZIP holding one ${note.label} per page — even for a single-page source, so the response never changes shape depending on your file. Extract it and use the images anywhere. The one ceiling is the archive itself: a document with so many pages that the images will not fit in memory at once is refused as too large, rather than half-produced.`,
            },
          ]
        : []),
      {
        question: "Is it free? Do I need an account?",
        answer:
          "Free, with no account, no email and no sign-up. There is no paid tier and nothing is metered beyond a rate limit that keeps the service standing.",
      },
      {
        question: "What happens to my file?",
        answer:
          "It is converted in a temporary workspace on the server that is deleted before the response is even sent back to you — on success, on failure, on timeout, and if you close the page mid-conversion. Document contents and filenames are never logged; only the request id, byte size, duration and outcome are recorded. Nothing is stored in your browser beyond the file you picked.",
      },
      {
        question: "How long does it take?",
        answer:
          "Seconds for most documents. Simple text and images are near-instant; a large presentation can take longer. A conversion still running at 90 seconds is stopped by the server, and this page gives up at 120.",
      },
    ],
  };
}

/**
 * The homepage's own questions.
 *
 * The third one is the one worth having. Plenty of converters — and this
 * homepage is modelled on one of them — take PDF *in* and turn it into Word.
 * This service does not: there is no `.pdf` in its `SOURCES`, so that
 * conversion does not exist here, and a visitor arriving with a PDF and a
 * reasonable expectation deserves an answer rather than a 404.
 */
export const HOME_FAQS: readonly { question: string; answer: string }[] = [
  {
    question: "What can this converter do?",
    answer:
      "It converts between document, spreadsheet, presentation and image formats in both directions where the formats allow it: Word, Excel, PowerPoint (including their older extensions), ODT, ODS, ODP, ODG, CSV, TXT, HTML, RTF, Markdown and other plain-text markup, PNG and JPG in, and now PDF itself back in too — PDF to Word, PowerPoint, Excel or Markdown. Every combination the service supports has its own page — see all conversions.",
  },
  {
    question: "Can I convert a PDF back into Word or Excel?",
    answer:
      "Yes — PDF to Word, PDF to PowerPoint, PDF to Excel and PDF to Markdown are all here. Extraction quality depends on how the PDF was made: one exported from a word processor carries real structure back out; a PDF that is a scan of a page has no text layer to extract, and needs OCR first.",
  },
  {
    question: "Is it free? Do I need an account?",
    answer:
      "Free, with no account, no email and no sign-up. There is no paid tier and no export limit; the only ceiling is a rate limit that exists to keep the service standing, which is why a burst of requests can be answered with \"try again in a moment\".",
  },
  {
    question: "What happens to my files?",
    answer:
      "Each file is converted in a temporary workspace that is deleted before the response is even sent back to you — on success, on failure, on timeout, and if you close the page mid-conversion. Document contents and filenames are never logged; only the request id, byte size, duration and outcome are recorded.",
  },
  {
    question: "Is there a file size limit?",
    answer: `25 MB per file. A conversion still running after 90 seconds is stopped by the server, and the page gives up at 120. Neither limit is a paywall — they are the point at which the service stops being able to answer honestly.`,
  },
  {
    question: "Does it work on a phone?",
    answer:
      "Yes. It is a web page, so it works in any modern browser on a phone, a tablet or a desktop, with nothing to install and nothing to keep updated.",
  },
];

/** Every page, in `PAIRS` order. */
export const CATALOG: readonly ConversionEntry[] = PAIRS.map(([key, target, angle]) => {
  const source = SOURCES.find((group) => group.key === key);
  if (!source) throw new Error(`catalog: unknown source group "${key}"`);
  return composeEntry(source, target, angle);
});

/** Every slug, for `generateStaticParams` and the sitemap. */
export const SLUGS: readonly string[] = CATALOG.map((entry) => entry.slug);

/** The page for a slug, or `null`. */
export function findEntry(slug: string): ConversionEntry | null {
  return CATALOG.find((entry) => entry.slug === slug) ?? null;
}

/**
 * The other formats this page's source can become.
 *
 * `word_to_pdf` → `word_to_odt`, `word_to_epub`, and so on. This is the page's
 * most useful "you might have meant" list: somebody who came for Word to PDF and
 * actually needs EPUB is one click away instead of back at the grid.
 */
export function otherTargetsFor(entry: ConversionEntry): readonly ConversionEntry[] {
  return CATALOG.filter(
    (other) => other.source.key === entry.source.key && other.target !== entry.target,
  );
}

/**
 * The other sources that can reach this page's target.
 *
 * `word_to_pdf` → `excel_to_pdf`, `png_to_pdf`, and so on. This is the cluster
 * that makes a set of conversion pages worth more than the sum of its parts:
 * every page links to its siblings and to its cousins, so no page is a dead end
 * and the internal link graph has no orphans.
 */
export function otherSourcesFor(entry: ConversionEntry): readonly ConversionEntry[] {
  return CATALOG.filter(
    (other) => other.target === entry.target && other.source.key !== entry.source.key,
  );
}

/**
 * The catalog grouped by family, in `SOURCES` order — how the homepage grid and
 * the index page are laid out.
 *
 * The markup group (pandoc, not LibreOffice) has no `family`, so it cannot be
 * grouped by one — but it still has six pages that have to be reachable from
 * somewhere, or they are orphans the sitemap alone cannot rescue. It is grouped
 * here under its own `label`, keyed by its source key, so the footer and the
 * index link it alongside the four LibreOffice families.
 *
 * `key` is the grouping key (`"writer"`, `"markup"`), not the family, precisely
 * because the family is `undefined` for one of the groups returned.
 */
export function entriesByFamily(): ReadonlyArray<{
  key: string;
  label: string;
  entries: readonly ConversionEntry[];
}> {
  const families = SOURCES.map((group) => group.family).filter(
    (family, index, all): family is Family => family !== undefined && all.indexOf(family) === index,
  );

  const grouped = families.map((family) => ({
    key: family as string,
    label: FAMILY_LABELS[family],
    entries: CATALOG.filter((entry) => entry.source.family === family),
  }));

  // The family-less sources (the markup group), one section each, under its own
  // `label` — so nothing the catalog publishes is left unreachable from here.
  const ungrouped = SOURCES.filter((group) => group.family === undefined).map((group) => ({
    key: group.key,
    label: group.label,
    entries: CATALOG.filter((entry) => entry.source.key === group.key),
  }));

  return [...grouped, ...ungrouped.filter((group) => group.entries.length > 0)];
}


/**
 * The conversions linked from the header, the footer and the 404.
 *
 * Chosen because they are the reason most people arrive, not because they are
 * special to the code: every page is equal as far as the converter is concerned.
 */
export const POPULAR_SLUGS: readonly string[] = [
  "word_to_pdf",
  "excel_to_pdf",
  "powerpoint_to_pdf",
  "jpg_to_pdf",
  "png_to_pdf",
  "csv_to_xlsx",
];

/** The popular entries, resolved. */
export const POPULAR: readonly ConversionEntry[] = POPULAR_SLUGS.map((slug) => {
  const entry = findEntry(slug);
  if (!entry) throw new Error(`catalog: POPULAR_SLUGS names unknown slug "${slug}"`);
  return entry;
});

/**
 * The two `/tools/*` pages that are neither a catalog pair nor a `/pdf/*`
 * tool: `extract-tables` and `psd-to-layers` (see the note at the top of each
 * page). Named here, alongside the pages, rather than at their one other
 * caller (`lib/search/buildIndex.ts`) — the extensions are editorial content,
 * exactly like everything else in this file, and `tests/content/matrix.test.tsx`
 * exempts this file for that reason rather than needing a second exemption.
 */
export interface ExtraTool {
  id: string;
  label: string;
  route: string;
  extensions: readonly string[];
}

export const EXTRA_TOOLS: readonly ExtraTool[] = [
  {
    id: "extract-tables",
    label: "Extract tables from Word",
    route: "/tools/extract-tables",
    extensions: [".docx", ".docm"],
  },
  {
    id: "psd-to-layers",
    label: "PSD to layers",
    route: "/tools/psd-to-layers",
    extensions: [".psd"],
  },
];
