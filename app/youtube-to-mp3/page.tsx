import { YouTubeConversionPage, youtubePageMetadata } from "@/components/media/YouTubeConversionPage";
import { youtubeEntryFor } from "@/lib/media/youtubeCatalog";

/**
 * `/youtube-to-mp3`: a YouTube link in, the video's audio track out as an MP3.
 * A static route rather than a dynamic one, so it wins over the root
 * `app/[conversion]` segment and needs no `generateStaticParams` of its own.
 */
const entry = youtubeEntryFor("mp3");

export const metadata = youtubePageMetadata(entry);

export default function YouTubeToMp3Page(): React.ReactElement {
  return <YouTubeConversionPage entry={entry} />;
}
