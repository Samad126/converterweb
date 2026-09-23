"use client";

/**
 * The tool on one `/audio/*` or `/video/*` page — `useMediaTool` wired into
 * `MediaToolShell`.
 */
import { MediaToolShell } from "@/components/media/MediaToolShell";
import type { MediaConversionEntry } from "@/lib/media/mediaCatalog";
import { useMediaTool } from "@/lib/media/useMediaTool";

export function MediaConvertTool({ entry }: { entry: MediaConversionEntry }): React.ReactElement {
  const tool = useMediaTool(entry.target.id, [entry.source.extension], entry.target.extension);
  return <MediaToolShell tool={tool} acceptedExtension={entry.source.extension} onRun={() => tool.run()} />;
}
