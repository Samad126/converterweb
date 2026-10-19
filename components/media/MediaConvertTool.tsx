"use client";

/**
 * The tool on one `/audio/*` or `/video/*` page — a file in, and the shared
 * run and result panel out. `useMediaTool` picks and checks the file, and
 * `MediaToolShell` does the rest.
 */
import { DropZone } from "@/components/ui/DropZone";
import { MediaToolShell } from "@/components/media/MediaToolShell";
import { formatBytes } from "@/lib/format";
import type { MediaConversionEntry } from "@/lib/media/mediaCatalog";
import { MEDIA_MAX_UPLOAD_BYTES, useMediaTool } from "@/lib/media/useMediaTool";

export function MediaConvertTool({ entry }: { entry: MediaConversionEntry }): React.ReactElement {
  const tool = useMediaTool(entry.target.id, [entry.source.extension], entry.target.extension);
  const running = tool.phase.name === "running";

  return (
    <MediaToolShell tool={tool} onRun={() => tool.run()}>
      <section className="flex flex-col gap-3">
        <h2 className="step-heading">
          <span className="step-number">1</span> Choose a {entry.source.extension} file
        </h2>

        {tool.file ? (
          <div className="chosen-file">
            <span className="file-name">{tool.file.name}</span>
            <span className="meta">{formatBytes(tool.file.size)}</span>
            <button type="button" className="btn-quiet" onClick={tool.clearFile} disabled={running}>
              Remove
            </button>
          </div>
        ) : (
          <DropZone
            id="media-tool-file"
            accept={entry.source.extension}
            acceptedLabel={entry.source.extension}
            limitLabel={formatBytes(MEDIA_MAX_UPLOAD_BYTES)}
            disabled={running}
            onSelect={tool.selectFile}
          />
        )}

        {tool.fileError ? (
          <ul className="flex flex-col gap-1" role="alert">
            <li className="notice">{tool.fileError}</li>
          </ul>
        ) : null}
      </section>
    </MediaToolShell>
  );
}
