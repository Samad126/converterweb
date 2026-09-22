/**
 * The audio/video matrix for `POST /media/{target}`, mirrored by hand from
 * the backend's `src/formats-media.ts`.
 *
 * There is no `GET /formats`-style endpoint for this matrix — `/media/*`
 * predates it having one, and ffmpeg's zero-flag transcode needs no
 * per-source filter the way LibreOffice does, so the service never grew a
 * discovery endpoint for it. `lib/formats.ts`'s ban on hard-coded extensions
 * is about the *document* matrix specifically (see its own header comment);
 * this file is the media equivalent of that ban's one exemption,
 * `lib/catalog.ts` — a table that has to be written down somewhere because
 * nothing serves it at runtime.
 *
 * Every extension here converts to every other extension of the same kind:
 * audio to audio, video to video, never across, and never to itself.
 */

export type MediaKind = "audio" | "video";

export interface MediaFormat {
  /** The `/media/{id}` path segment and this format's catalog key. */
  id: string;
  /** The accepted upload extension, dot-prefixed. */
  extension: string;
  kind: MediaKind;
  /** The response `Content-Type` for this target. */
  mediaType: string;
  /** How the format is written in prose: "MP3", "MKV". */
  label: string;
}

export const AUDIO_FORMATS: readonly MediaFormat[] = [
  { id: "mp3", extension: ".mp3", kind: "audio", mediaType: "audio/mpeg", label: "MP3" },
  { id: "wav", extension: ".wav", kind: "audio", mediaType: "audio/wav", label: "WAV" },
  { id: "flac", extension: ".flac", kind: "audio", mediaType: "audio/flac", label: "FLAC" },
  { id: "ogg", extension: ".ogg", kind: "audio", mediaType: "audio/ogg", label: "OGG" },
  { id: "aac", extension: ".aac", kind: "audio", mediaType: "audio/aac", label: "AAC" },
  { id: "m4a", extension: ".m4a", kind: "audio", mediaType: "audio/mp4", label: "M4A" },
  { id: "wma", extension: ".wma", kind: "audio", mediaType: "audio/x-ms-wma", label: "WMA" },
  { id: "opus", extension: ".opus", kind: "audio", mediaType: "audio/opus", label: "OPUS" },
  { id: "aiff", extension: ".aiff", kind: "audio", mediaType: "audio/aiff", label: "AIFF" },
  { id: "m4b", extension: ".m4b", kind: "audio", mediaType: "audio/mp4", label: "M4B" },
  { id: "ac3", extension: ".ac3", kind: "audio", mediaType: "audio/ac3", label: "AC3" },
  { id: "au", extension: ".au", kind: "audio", mediaType: "audio/basic", label: "AU" },
  { id: "caf", extension: ".caf", kind: "audio", mediaType: "audio/x-caf", label: "CAF" },
  { id: "oga", extension: ".oga", kind: "audio", mediaType: "audio/ogg", label: "OGA" },
  { id: "voc", extension: ".voc", kind: "audio", mediaType: "audio/x-voc", label: "VOC" },
];

export const VIDEO_FORMATS: readonly MediaFormat[] = [
  { id: "mp4", extension: ".mp4", kind: "video", mediaType: "video/mp4", label: "MP4" },
  { id: "webm", extension: ".webm", kind: "video", mediaType: "video/webm", label: "WEBM" },
  { id: "mkv", extension: ".mkv", kind: "video", mediaType: "video/x-matroska", label: "MKV" },
  { id: "avi", extension: ".avi", kind: "video", mediaType: "video/x-msvideo", label: "AVI" },
  { id: "mov", extension: ".mov", kind: "video", mediaType: "video/quicktime", label: "MOV" },
  { id: "flv", extension: ".flv", kind: "video", mediaType: "video/x-flv", label: "FLV" },
  { id: "asf", extension: ".asf", kind: "video", mediaType: "video/x-ms-asf", label: "ASF" },
  { id: "f4v", extension: ".f4v", kind: "video", mediaType: "video/mp4", label: "F4V" },
  { id: "m4v", extension: ".m4v", kind: "video", mediaType: "video/x-m4v", label: "M4V" },
  { id: "mpeg", extension: ".mpeg", kind: "video", mediaType: "video/mpeg", label: "MPEG" },
  { id: "ogv", extension: ".ogv", kind: "video", mediaType: "video/ogg", label: "OGV" },
  { id: "ts", extension: ".ts", kind: "video", mediaType: "video/mp2t", label: "TS" },
  { id: "wmv", extension: ".wmv", kind: "video", mediaType: "video/x-ms-wmv", label: "WMV" },
];

export const MEDIA_FORMATS: readonly MediaFormat[] = [...AUDIO_FORMATS, ...VIDEO_FORMATS];

export function mediaFormatsFor(kind: MediaKind): readonly MediaFormat[] {
  return kind === "audio" ? AUDIO_FORMATS : VIDEO_FORMATS;
}

export function findMediaFormat(id: string): MediaFormat | null {
  return MEDIA_FORMATS.find((format) => format.id === id) ?? null;
}

/** Every target a given source id can become: same kind, never itself. */
export function mediaTargetsFor(sourceId: string): readonly MediaFormat[] {
  const source = findMediaFormat(sourceId);
  if (!source) return [];
  return mediaFormatsFor(source.kind).filter((format) => format.id !== source.id);
}
