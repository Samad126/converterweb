/**
 * Human synonyms for the words people actually type, keyed by the word they
 * type and pointing at the extensions/ids that answer it.
 *
 * This is not a second copy of the conversion matrix — it never claims a file
 * type exists or that a conversion is possible, both of which still come from
 * `GET /formats` and `lib/catalog.ts` alone. It only widens *matching*: typing
 * "excel" should find the same items typing "xlsx" does.
 */
export const SYNONYMS: Readonly<Record<string, readonly string[]>> = {
  jpg: ["jpeg"],
  jpeg: ["jpg"],
  word: ["doc", "docx", "docm"],
  doc: ["word"],
  docx: ["word"],
  docm: ["word"],
  excel: ["xls", "xlsx"],
  xls: ["excel"],
  xlsx: ["excel"],
  powerpoint: ["ppt", "pptx"],
  slides: ["ppt", "pptx"],
  ppt: ["powerpoint", "slides"],
  pptx: ["powerpoint", "slides"],
  spreadsheet: ["xls", "xlsx", "csv", "ods"],
  presentation: ["ppt", "pptx", "odp"],
  photoshop: ["psd"],
  psd: ["photoshop"],
  // Media. Nothing here claims a transcode is possible — it only widens
  // matching, so "song" finds the audio pairs and "movie" finds the video ones
  // the same way "spreadsheet" already finds the xlsx pages.
  audio: ["mp3", "wav", "flac", "m4a", "aac", "ogg"],
  song: ["mp3", "wav", "flac", "audio"],
  music: ["mp3", "wav", "flac", "audio"],
  wav: ["audio"],
  flac: ["audio"],
  m4a: ["audio"],
  aac: ["audio"],
  ogg: ["audio"],
  opus: ["audio"],
  video: ["mp4", "webm", "mkv", "mov", "avi"],
  movie: ["mp4", "webm", "mkv", "mov", "video"],
  mp4: ["video"],
  webm: ["video"],
  mkv: ["video"],
  mov: ["video"],
  avi: ["video"],
};

/** Every synonym reachable from any of `words`, deduplicated. */
export function synonymsFor(words: readonly string[]): string[] {
  const out = new Set<string>();
  for (const word of words) {
    for (const synonym of SYNONYMS[word.toLowerCase()] ?? []) out.add(synonym);
  }
  return [...out];
}
