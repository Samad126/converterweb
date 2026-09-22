/**
 * The `/audio/*` and `/video/*` conversion pages — the media equivalent of
 * `lib/catalog.ts`, generated rather than hand-written.
 *
 * The document catalog earns hand-written prose because each pair has a real
 * story: Word to PDF is about fidelity, Word to EPUB is about reflow, and the
 * two are not interchangeable sentences. A media transcode has no such
 * story — `backend/src/formats-media.ts` runs the same zero-flag `ffmpeg -i
 * in out` for every pair of its own kind, so "MP3 to WAV" and "MP3 to FLAC"
 * differ only in which two labels are in the sentence. Writing 392 pairs of
 * fabricated distinctions would be dishonest content; a single template
 * filled in per pair is the honest version of the same page count.
 *
 * `dynamicParams = false` on both `app/audio/[conversion]/page.tsx` and
 * `app/video/[conversion]/page.tsx` makes this catalog the exhaustive,
 * enumerable set of URLs, exactly as `lib/catalog.ts` does for documents.
 */
import { type MediaFormat, type MediaKind, mediaFormatsFor, findMediaFormat } from "./mediaFormats";

export interface MediaConversionEntry {
  kind: MediaKind;
  /** The URL: `mp3_to_wav`, under `/audio/` or `/video/`. */
  slug: string;
  /** `/audio/mp3_to_wav` or `/video/mp4_to_webm`. */
  route: string;
  source: MediaFormat;
  target: MediaFormat;
  heading: string;
  title: string;
  description: string;
  lede: string;
  faqs: readonly { question: string; answer: string }[];
}

const KIND_NOUN: Readonly<Record<MediaKind, string>> = {
  audio: "audio",
  video: "video",
};

export function slugFor(sourceId: string, targetId: string): string {
  return `${sourceId}_to_${targetId}`;
}

function routeFor(kind: MediaKind, slug: string): string {
  return `/${kind}/${slug}`;
}

function composeEntry(kind: MediaKind, source: MediaFormat, target: MediaFormat): MediaConversionEntry {
  const slug = slugFor(source.id, target.id);
  const heading = `${source.label} to ${target.label}`;
  const noun = KIND_NOUN[kind];

  return {
    kind,
    slug,
    route: routeFor(kind, slug),
    source,
    target,
    heading,
    title: `${heading} — Free Online Converter`,
    description: `Convert ${source.label} to ${target.label} free online. No sign-up, files up to 500 MB, and nothing left on the server.`,
    lede: `Convert a ${source.label} file to ${target.label} in the browser. Nothing to install, no account to make, and the file comes straight back once it's done.`,
    faqs: [
      {
        question: `Which files can I convert to ${target.label}?`,
        answer: `Any ${source.label} (${source.extension}) file, up to 500 MB. Anything else is refused before it is uploaded, so a wrong file costs you nothing.`,
      },
      {
        question: `What does the ${target.label} output look like?`,
        answer: `A ${target.label} file (${target.extension}), transcoded with ffmpeg using its own default settings for that format — no re-encoding options to configure.`,
      },
      {
        question: "Is it free? Do I need an account?",
        answer:
          "Free, with no account, no email and no sign-up. There is no paid tier and nothing is metered beyond a rate limit that keeps the service standing.",
      },
      {
        question: "What happens to my file?",
        answer:
          "It is converted in a temporary workspace on the server that is deleted once the job finishes — on success, on failure, and on timeout. Nothing is stored in your browser beyond the file you picked.",
      },
      {
        question: "How long does it take?",
        answer: `${noun.charAt(0).toUpperCase()}${noun.slice(1)} conversion runs in the background: the page uploads the file, then checks in every couple of seconds until it's done. A short clip finishes in seconds; a long or large file can take longer.`,
      },
    ],
  };
}

function pairsFor(kind: MediaKind): readonly MediaConversionEntry[] {
  const formats = mediaFormatsFor(kind);
  const entries: MediaConversionEntry[] = [];
  for (const source of formats) {
    for (const target of formats) {
      if (source.id === target.id) continue;
      entries.push(composeEntry(kind, source, target));
    }
  }
  return entries;
}

export const AUDIO_CATALOG: readonly MediaConversionEntry[] = pairsFor("audio");
export const VIDEO_CATALOG: readonly MediaConversionEntry[] = pairsFor("video");
export const MEDIA_CATALOG: readonly MediaConversionEntry[] = [...AUDIO_CATALOG, ...VIDEO_CATALOG];

export const AUDIO_SLUGS: readonly string[] = AUDIO_CATALOG.map((entry) => entry.slug);
export const VIDEO_SLUGS: readonly string[] = VIDEO_CATALOG.map((entry) => entry.slug);

export function findMediaEntry(kind: MediaKind, slug: string): MediaConversionEntry | null {
  const catalog = kind === "audio" ? AUDIO_CATALOG : VIDEO_CATALOG;
  return catalog.find((entry) => entry.slug === slug) ?? null;
}

/** The other targets this source can reach, for internal linking. */
export function otherTargetsFor(entry: MediaConversionEntry): readonly MediaConversionEntry[] {
  const catalog = entry.kind === "audio" ? AUDIO_CATALOG : VIDEO_CATALOG;
  return catalog.filter((other) => other.source.id === entry.source.id && other.target.id !== entry.target.id);
}

/** The other sources that can reach this target, for internal linking. */
export function otherSourcesFor(entry: MediaConversionEntry): readonly MediaConversionEntry[] {
  const catalog = entry.kind === "audio" ? AUDIO_CATALOG : VIDEO_CATALOG;
  return catalog.filter((other) => other.target.id === entry.target.id && other.source.id !== entry.source.id);
}

/** A handful of popular pairs per kind, for the hub pages and internal links. */
export const POPULAR_AUDIO_SLUGS: readonly string[] = [
  "wav_to_mp3",
  "flac_to_mp3",
  "m4a_to_mp3",
  "mp3_to_wav",
  "ogg_to_mp3",
  "wma_to_mp3",
];

export const POPULAR_VIDEO_SLUGS: readonly string[] = [
  "mov_to_mp4",
  "mkv_to_mp4",
  "avi_to_mp4",
  "mp4_to_webm",
  "wmv_to_mp4",
  "flv_to_mp4",
];

function resolvePopular(kind: MediaKind, slugs: readonly string[]): readonly MediaConversionEntry[] {
  return slugs.map((slug) => {
    const entry = findMediaEntry(kind, slug);
    if (!entry) throw new Error(`mediaCatalog: unknown popular slug "${slug}" for ${kind}`);
    return entry;
  });
}

export const POPULAR_AUDIO: readonly MediaConversionEntry[] = resolvePopular("audio", POPULAR_AUDIO_SLUGS);
export const POPULAR_VIDEO: readonly MediaConversionEntry[] = resolvePopular("video", POPULAR_VIDEO_SLUGS);

/** Re-exported so pages don't need to reach into `lib/mediaFormats` directly. */
export { findMediaFormat };
