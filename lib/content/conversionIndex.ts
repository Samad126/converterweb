/**
 * Every conversion the site offers, in one shape, for `/conversions`.
 *
 * The document matrix (`catalog.ts`) and the audio/video matrix
 * (`lib/media/mediaCatalog.ts`) are separate backend facilities with separate
 * catalogs, so the page that claims to list "all conversions" has to read from
 * both. This module is that join: it reshapes each catalog into
 * source -> targets groups the finder and the page sections can share, and
 * invents no pair of its own - every target here is a page one of the two
 * catalogs already publishes.
 */
import { AUDIO_CATALOG, VIDEO_CATALOG, type MediaConversionEntry } from "../media/mediaCatalog";
import { AUDIO_FORMATS, VIDEO_FORMATS, type MediaFormat } from "../media/mediaFormats";
import { FILE_CATALOG, FILE_CATEGORIES } from "../files/fileCatalog";
import { CATALOG, FAMILY_LABELS, SOURCES, TARGETS, type Family } from "./catalog";

export interface FinderTarget {
  href: string;
  label: string;
  badge: string;
}

export interface FinderSource {
  /** Unique across every group: `doc:word`, `audio:mp3`. */
  key: string;
  label: string;
  badge: string;
  /** Extra lower-case words a query can hit besides the label: extensions, ids, the group name. */
  searchTerms: readonly string[];
  targets: readonly FinderTarget[];
}

export interface FinderGroup {
  key: string;
  label: string;
  sources: readonly FinderSource[];
}

function documentSources(family: Family | undefined): FinderSource[] {
  return SOURCES.filter((source) => source.family === family).map((source) => ({
    key: `doc:${source.key}`,
    label: source.label,
    badge: source.badge,
    searchTerms: [...source.extensions, source.key].map((term) => term.toLowerCase()),
    targets: CATALOG.filter((entry) => entry.source.key === source.key).map((entry) => ({
      href: `/${entry.slug}`,
      label: TARGETS[entry.target].label,
      badge: TARGETS[entry.target].badge,
    })),
  }));
}

function mediaSources(
  formats: readonly MediaFormat[],
  catalog: readonly MediaConversionEntry[],
  kindLabel: string,
): FinderSource[] {
  return formats.map((format) => ({
    key: `${format.kind}:${format.id}`,
    label: format.label,
    badge: format.label,
    // The kind word is a search term so typing "audio" or "video" lists every source of that kind.
    searchTerms: [format.extension, format.id, kindLabel].map((term) => term.toLowerCase()),
    targets: catalog
      .filter((entry) => entry.source.id === format.id)
      .map((entry) => ({ href: entry.route, label: entry.target.label, badge: entry.target.label })),
  }));
}

function fileGroups(): FinderGroup[] {
  return FILE_CATEGORIES.flatMap(({ key, label }) => {
    const entries = FILE_CATALOG.filter((entry) => entry.category === key);
    const labels = [...new Set(entries.map((entry) => entry.sourceLabel))];
    const sources: FinderSource[] = labels.map((sourceLabel) => {
      const own = entries.filter((entry) => entry.sourceLabel === sourceLabel);
      const extensions = own[0]?.extensions ?? [];
      return {
        key: `file:${sourceLabel.toLowerCase()}`,
        label: sourceLabel,
        badge: sourceLabel,
        searchTerms: [...extensions, sourceLabel, label].map((term) => term.toLowerCase()),
        targets: own.map((entry) => ({
          href: entry.route,
          label: entry.targetLabel,
          badge: entry.targetLabel,
        })),
      };
    });
    return sources.length === 0 ? [] : [{ key: `files:${key}`, label, sources }];
  });
}

function buildGroups(): FinderGroup[] {
  const families: Family[] = [];
  for (const source of SOURCES) {
    if (source.family !== undefined && !families.includes(source.family)) families.push(source.family);
  }

  const groups: FinderGroup[] = families.map((family) => ({
    key: family,
    label: FAMILY_LABELS[family],
    sources: documentSources(family),
  }));

  // The family-less sources (pandoc's markup group): still document conversions, so still listed.
  const markup = documentSources(undefined);
  if (markup.length > 0) groups.push({ key: "markup", label: "Markdown & markup", sources: markup });

  groups.push({ key: "audio", label: "Audio", sources: mediaSources(AUDIO_FORMATS, AUDIO_CATALOG, "audio") });
  groups.push({ key: "video", label: "Video", sources: mediaSources(VIDEO_FORMATS, VIDEO_CATALOG, "video") });

  groups.push(...fileGroups());

  return mergeSameSources(groups);
}

/**
 * The document catalog and the file catalog are separate tables, so a format
 * both know about (PDF, PNG, JPG) is a source in each. Listed twice it shows up
 * as two identical rows under different headings — and PDF, which the document
 * catalog files under "Images" because LibreOffice Draw opens it, is a
 * document to everyone else. Each label is kept once, in the *last* group that
 * has it (the file catalog's, whose headings are the plain ones), with the
 * targets of every copy combined.
 */
function mergeSameSources(groups: readonly FinderGroup[]): FinderGroup[] {
  const homeOf = new Map<string, number>();
  groups.forEach((group, index) => {
    for (const source of group.sources) homeOf.set(source.label.toLowerCase(), index);
  });

  const combined = new Map<string, FinderSource>();
  for (const group of groups) {
    for (const source of group.sources) {
      const id = source.label.toLowerCase();
      const seen = combined.get(id);
      if (!seen) {
        combined.set(id, source);
        continue;
      }
      const hrefs = new Set(seen.targets.map((target) => target.href));
      combined.set(id, {
        ...source,
        searchTerms: [...new Set([...seen.searchTerms, ...source.searchTerms])],
        targets: [...seen.targets, ...source.targets.filter((target) => !hrefs.has(target.href))],
      });
    }
  }

  const kept = groups
    .map((group, index) => ({
      ...group,
      sources: group.sources
        .filter((source) => homeOf.get(source.label.toLowerCase()) === index)
        .map((source) => combined.get(source.label.toLowerCase()) ?? source),
    }))
    .filter((group) => group.sources.length > 0);

  // "Images" exists twice (the document catalog's Draw family and the file
  // catalog's category); one heading, at the first one's position.
  const byLabel = new Map<string, FinderGroup>();
  for (const group of kept) {
    const first = byLabel.get(group.label);
    byLabel.set(group.label, first ? { ...first, sources: [...first.sources, ...group.sources] } : group);
  }
  return [...byLabel.values()];
}

export const FINDER_GROUPS: readonly FinderGroup[] = buildGroups();

export const TOTAL_CONVERSIONS: number = CATALOG.length + AUDIO_CATALOG.length + VIDEO_CATALOG.length + FILE_CATALOG.length;
