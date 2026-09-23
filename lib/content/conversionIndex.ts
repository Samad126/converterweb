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

  return groups;
}

export const FINDER_GROUPS: readonly FinderGroup[] = buildGroups();

export const TOTAL_CONVERSIONS: number = CATALOG.length + AUDIO_CATALOG.length + VIDEO_CATALOG.length;
