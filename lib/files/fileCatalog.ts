/**
 * The conversion pages for everything the service converts that the document,
 * audio and video catalogs do not already cover: archives, images, data files,
 * subtitles, e-books, fonts, 3D models, email and the remaining document pairs.
 *
 * One page per source-and-target pair at `/files/{source}_to_{target}`, its
 * prose templated from a category noun — like the media catalog, and for the
 * same reason: at this scale a hand-written page per pair would drift from the
 * matrix. The pairs come from `fileMatrix.ts`, a snapshot of the backend; what a
 * page can actually do is still decided at runtime by `GET /formats`.
 *
 * Pairs the document catalog already owns are skipped, so a conversion has one
 * page and one URL. `tables` and `layers` are skipped too: they are extraction
 * tools with pages of their own under `/tools`.
 */
import { CATALOG } from "../content/catalog";
import { MAX_UPLOAD_BYTES } from "../constants";
import { formatBytes } from "../format";
import { FILE_MATRIX, FILE_TARGETS } from "./fileMatrix";

export type FileCategory =
  | "document"
  | "image"
  | "data"
  | "archive"
  | "subtitle"
  | "ebook"
  | "font"
  | "model"
  | "email";

interface CategoryInfo {
  label: string;
  /** What one of these files is called in a sentence: "a ZIP archive". */
  noun: string;
  extensions: readonly string[];
}

const CATEGORIES: Readonly<Record<FileCategory, CategoryInfo>> = {
  document: {
    label: "More documents",
    noun: "document",
    extensions: [
      ".docx", ".docm", ".doc", ".dot", ".dotx", ".odt", ".ods", ".odg", ".odp", ".xlsx", ".xls",
      ".xlsm", ".pptx", ".ppt", ".pptm", ".pps", ".ppsx", ".pot", ".potx", ".txt", ".html", ".htm",
      ".rtf", ".pdf", ".md", ".rst", ".tex", ".textile", ".org", ".opml", ".muse", ".ipynb",
    ],
  },
  image: {
    label: "Images",
    noun: "image",
    extensions: [
      ".png", ".jpg", ".jpeg", ".psd", ".bmp", ".gif", ".tiff", ".webp", ".avif", ".ico", ".jxl",
      ".jp2", ".qoi", ".tga", ".pcx", ".apng", ".heic", ".heif", ".svg", ".emf", ".wmf", ".eps",
    ],
  },
  data: {
    label: "Data files",
    noun: "data file",
    extensions: [
      ".csv", ".tsv", ".json", ".yaml", ".yml", ".jsonl", ".xml", ".toml", ".ini", ".sqlite",
      ".parquet", ".orc", ".feather",
    ],
  },
  archive: {
    label: "Archives",
    noun: "archive",
    extensions: [
      ".zip", ".tar", ".tgz", ".tbz2", ".txz", ".gz", ".bz2", ".xz", ".zst", ".7z", ".rar", ".iso",
      ".cbz",
    ],
  },
  subtitle: {
    label: "Subtitles",
    noun: "subtitle file",
    extensions: [".srt", ".vtt", ".ass", ".ssa"],
  },
  ebook: {
    label: "E-books",
    noun: "e-book",
    extensions: [".epub", ".mobi", ".azw3", ".fb2", ".lrf", ".pdb"],
  },
  font: { label: "Fonts", noun: "font", extensions: [".ttf", ".otf", ".woff", ".woff2"] },
  model: {
    label: "3D models",
    noun: "3D model",
    extensions: [".obj", ".stl", ".ply", ".glb", ".3mf", ".off"],
  },
  email: { label: "Email", noun: "email message", extensions: [".eml"] },
};

/** Extensions that are the same format under two names share one page. */
const ALIASES: readonly (readonly string[])[] = [
  [".jpg", ".jpeg"],
  [".yaml", ".yml"],
  [".html", ".htm"],
  [".heic", ".heif"],
];

/** Targets that are extraction tools with their own pages, not conversions. */
const SKIPPED_TARGETS: ReadonlySet<string> = new Set(["tables", "layers"]);

export interface FileConversionEntry {
  slug: string;
  /** `/files/rar_to_zip`. */
  route: string;
  category: FileCategory;
  /** Every extension the page accepts: one, or an alias pair. */
  extensions: readonly string[];
  sourceLabel: string;
  targetId: string;
  targetLabel: string;
  heading: string;
  title: string;
  description: string;
  lede: string;
  faqs: readonly { question: string; answer: string }[];
}

function categoryOf(extension: string): FileCategory {
  for (const [key, info] of Object.entries(CATEGORIES)) {
    if (info.extensions.includes(extension)) return key as FileCategory;
  }
  throw new Error(`fileCatalog: no category for "${extension}" — add it to CATEGORIES`);
}

function slugPart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

/** Pairs the document catalog already has a page for. */
function coveredByCatalog(): ReadonlySet<string> {
  const covered = new Set<string>();
  for (const entry of CATALOG) {
    for (const extension of entry.source.extensions) covered.add(`${extension}>${entry.target}`);
  }
  return covered;
}

function sourceGroups(): (readonly string[])[] {
  const grouped = new Set<string>(ALIASES.flat());
  const groups: (readonly string[])[] = ALIASES.filter((group) =>
    group.some((extension) => extension in FILE_MATRIX),
  );
  for (const extension of Object.keys(FILE_MATRIX)) {
    if (!grouped.has(extension)) groups.push([extension]);
  }
  return groups;
}

function buildEntry(
  extensions: readonly string[],
  targetId: string,
  category: FileCategory,
): FileConversionEntry {
  const first = extensions[0] ?? "";
  const sourceLabel = first.slice(1).toUpperCase();
  const targetLabel = FILE_TARGETS[targetId]?.label ?? targetId.toUpperCase();
  const slug = `${slugPart(first)}_to_${slugPart(targetId)}`;
  const heading = `${sourceLabel} to ${targetLabel}`;
  const limit = formatBytes(MAX_UPLOAD_BYTES);
  const noun = CATEGORIES[category].noun;
  const accepted = extensions.join(", ");

  return {
    slug,
    route: `/files/${slug}`,
    category,
    extensions,
    sourceLabel,
    targetId,
    targetLabel,
    heading,
    title: `${heading} — Free Online Converter`,
    description: `Convert ${sourceLabel} to ${targetLabel} free online. No sign-up, up to ${limit}, no file left on the server.`,
    lede: `Convert a ${sourceLabel} ${noun} to ${targetLabel} in the browser. Nothing to install, no account to make, and the file comes straight back.`,
    faqs: [
      {
        question: `Which files can I convert to ${targetLabel}?`,
        answer: `${sourceLabel} files (${accepted}), up to ${limit} in total. Anything else is refused before it is uploaded, so a wrong file costs you nothing.`,
      },
      {
        question: "Is my file kept?",
        answer:
          "No. It is converted in a temporary workspace that is deleted when the request ends, and its contents and filename are never logged.",
      },
      {
        question: `Does converting ${sourceLabel} to ${targetLabel} lose anything?`,
        answer: `A different format can hold different things, so the ${targetLabel} may not carry over every property of the ${sourceLabel}. Keep your original file — it is never modified.`,
      },
    ],
  };
}

function buildCatalog(): readonly FileConversionEntry[] {
  const covered = coveredByCatalog();
  const entries: FileConversionEntry[] = [];
  const seen = new Set<string>();

  for (const extensions of sourceGroups()) {
    const category = categoryOf(extensions[0] ?? "");
    const targets = new Set(extensions.flatMap((extension) => FILE_MATRIX[extension] ?? []));
    for (const targetId of targets) {
      if (SKIPPED_TARGETS.has(targetId)) continue;
      if (extensions.some((extension) => covered.has(`${extension}>${targetId}`))) continue;
      const entry = buildEntry(extensions, targetId, category);
      if (seen.has(entry.slug)) throw new Error(`fileCatalog: duplicate slug "${entry.slug}"`);
      seen.add(entry.slug);
      entries.push(entry);
    }
  }
  return entries;
}

export const FILE_CATALOG: readonly FileConversionEntry[] = buildCatalog();
export const FILE_SLUGS: readonly string[] = FILE_CATALOG.map((entry) => entry.slug);

export const FILE_CATEGORIES: readonly { key: FileCategory; label: string }[] = (
  Object.entries(CATEGORIES) as [FileCategory, CategoryInfo][]
).map(([key, info]) => ({ key, label: info.label }));

export function findFileEntry(slug: string): FileConversionEntry | null {
  return FILE_CATALOG.find((entry) => entry.slug === slug) ?? null;
}

export function otherFileTargetsFor(entry: FileConversionEntry): readonly FileConversionEntry[] {
  return FILE_CATALOG.filter((other) => other.sourceLabel === entry.sourceLabel && other.slug !== entry.slug);
}

export function otherFileSourcesFor(entry: FileConversionEntry): readonly FileConversionEntry[] {
  return FILE_CATALOG.filter((other) => other.targetId === entry.targetId && other.slug !== entry.slug).slice(0, 24);
}
