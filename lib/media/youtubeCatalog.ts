/**
 * The two `/youtube-to-*` pages: a YouTube link in, an MP3 or an MP4 out.
 *
 * Two pages rather than one with a picker, for the reason every conversion
 * page is one thing: `/youtube-to-mp3` is a page people search for by name, and
 * it should say, in its own HTML, the one job it does. The copy is written here
 * once and filled per target, because the two jobs differ only in what comes
 * back. Like `lib/media/mediaCatalog.ts`, nothing here claims a capability; the
 * service decides what it will download.
 */
import type { YouTubeTargetId } from "../api/contract";
import { findMediaFormat, type MediaFormat } from "./mediaFormats";

export interface YouTubeConversionEntry {
  /** The `POST /youtube/{target}` path segment, and the one output this page makes. */
  targetId: YouTubeTargetId;
  target: MediaFormat;
  /** `youtube-to-mp3`. */
  slug: string;
  /** `/youtube-to-mp3`. */
  route: string;
  heading: string;
  title: string;
  description: string;
  lede: string;
  /** What the job gives back, in one sentence, for the page's fact list. */
  output: string;
  faqs: readonly { question: string; answer: string }[];
}

const TARGET_IDS: readonly YouTubeTargetId[] = ["mp3", "mp4"];

/** What differs between the two pages, beyond the target's own label. */
const OUTPUT: Record<YouTubeTargetId, { lede: string; output: string; whatYouGet: string }> = {
  mp3: {
    lede: "Paste a YouTube link and get the video's audio track back as an MP3 file. Nothing to install, no account to make, and the file is ready to download when the conversion finishes.",
    output: "the audio track of the video, as an MP3 file",
    whatYouGet:
      "The audio track of the video, encoded as an MP3 file and named after the video's title. The picture is not kept.",
  },
  mp4: {
    lede: "Paste a YouTube link and get the video back as an MP4 file. Nothing to install, no account to make, and the file is ready to download when the conversion finishes.",
    output: "the video itself, as an MP4 file",
    whatYouGet:
      "The video itself, as an MP4 file named after the video's title. Where YouTube offers H.264 video, that is what the file gets, because it plays on the widest range of devices.",
  },
};

function composeEntry(targetId: YouTubeTargetId): YouTubeConversionEntry {
  const target = findMediaFormat(targetId);
  if (target === null) throw new Error(`youtubeCatalog: no media format for "${targetId}"`);

  const slug = `youtube-to-${targetId}`;
  const heading = `YouTube to ${target.label}`;
  const copy = OUTPUT[targetId];

  return {
    targetId,
    target,
    slug,
    route: `/${slug}`,
    heading,
    title: `${heading} — Free Online Converter`,
    description: `Download a YouTube video as ${target.label} free online. No sign-up, and nothing is kept on the server once the file is ready.`,
    lede: copy.lede,
    output: copy.output,
    faqs: [
      {
        question: "Which links can I paste?",
        answer:
          "Links to youtube.com, m.youtube.com, music.youtube.com and youtu.be, including Shorts, embed and live links. A playlist or a timestamp in the link is ignored: only the one video it names is converted.",
      },
      {
        question: `What do I get back?`,
        answer: copy.whatYouGet,
      },
      {
        question: "Why would a video not convert?",
        answer:
          "A video that is private, removed, age-restricted, members-only or blocked in this country cannot be downloaded, and neither can a live stream that has not ended yet. The message under the form says which one applies.",
      },
      {
        question: "Is there a size limit?",
        answer:
          "Yes. Videos over 200 MB are refused by default, before anything is saved. The message names the limit the service is using.",
      },
      {
        question: "Am I allowed to download this?",
        answer:
          "Only download videos you have the right to save. YouTube's terms of service and copyright law still apply to the file you keep.",
      },
      {
        question: "What happens to the video after it is converted?",
        answer:
          "The service downloads the video into a temporary workspace, converts it, and deletes that workspace when the job finishes, whether it worked or not. Nothing is stored in your browser beyond the file you download.",
      },
      {
        question: "Is it free? Do I need an account?",
        answer:
          "Free, with no account, no email and no sign-up. There is no paid tier and nothing is metered beyond a rate limit that keeps the service standing.",
      },
    ],
  };
}

export const YOUTUBE_CONVERSIONS: readonly YouTubeConversionEntry[] = TARGET_IDS.map(composeEntry);

/** The page for one target. Both targets have a page, so a miss is a bug in this file, not in the caller. */
export function youtubeEntryFor(targetId: YouTubeTargetId): YouTubeConversionEntry {
  const entry = YOUTUBE_CONVERSIONS.find((candidate) => candidate.targetId === targetId);
  if (entry === undefined) throw new Error(`youtubeCatalog: no page for "${targetId}"`);
  return entry;
}
