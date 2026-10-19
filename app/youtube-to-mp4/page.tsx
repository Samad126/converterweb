import { YouTubeConversionPage, youtubePageMetadata } from "@/components/media/YouTubeConversionPage";
import { youtubeEntryFor } from "@/lib/media/youtubeCatalog";

/**
 * `/youtube-to-mp4`: a YouTube link in, the video itself out as an MP4.
 * A static route, for the same reason as `/youtube-to-mp3`.
 */
const entry = youtubeEntryFor("mp4");

export const metadata = youtubePageMetadata(entry);

export default function YouTubeToMp4Page(): React.ReactElement {
  return <YouTubeConversionPage entry={entry} />;
}
