"use client";

/**
 * The tool on one `/youtube-to-*` page: a link in, and the shared run and
 * result panel out. `useYouTubeTool` holds the link, and `MediaToolShell` does
 * the rest.
 *
 * Step one is a text field, not a drop zone. Two things are specific to a link.
 * Once a failure is dismissed, focus goes back to the field, because "Try a
 * different link" is an instruction to edit it and the button is about to
 * disappear. And the field is not `type="url"`: the service accepts links with
 * no scheme, like `youtu.be/...`, and a browser's own URL check would refuse
 * those before the service got to say what it thinks.
 */
import { useEffect, useRef } from "react";

import { MediaToolShell } from "@/components/media/MediaToolShell";
import { recoveryForLink } from "@/lib/api/errors";
import type { YouTubeConversionEntry } from "@/lib/media/youtubeCatalog";
import { useYouTubeTool } from "@/lib/media/useYouTubeTool";

export function YouTubeConvertTool({ entry }: { entry: YouTubeConversionEntry }): React.ReactElement {
  const tool = useYouTubeTool(entry.targetId, entry.target.extension);
  const inputRef = useRef<HTMLInputElement>(null);
  const failed = tool.phase.name === "failed";

  // Set while a failure is showing, and read when it is dismissed. Not on mount,
  // so the page does not grab focus before the person has touched it.
  const wasFailed = useRef(false);
  useEffect(() => {
    if (failed) {
      wasFailed.current = true;
      return;
    }
    if (wasFailed.current) {
      wasFailed.current = false;
      inputRef.current?.focus();
    }
  }, [failed]);

  const running = tool.phase.name === "running";

  return (
    <MediaToolShell tool={tool} onRun={tool.run} recoveryOf={recoveryForLink}>
      <section className="flex flex-col gap-3">
        <h2 className="step-heading">
          <span className="step-number">1</span> Paste a YouTube link
        </h2>

        <label htmlFor="youtube-link" className="meta">
          YouTube video link
        </label>
        <input
          ref={inputRef}
          id="youtube-link"
          className="input"
          type="text"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="https://www.youtube.com/watch?v=…"
          aria-describedby="youtube-link-hint"
          value={tool.link}
          onChange={(event) => tool.setLink(event.target.value)}
          disabled={running}
        />
        <p id="youtube-link-hint" className="meta">
          Links to youtube.com, m.youtube.com, music.youtube.com or youtu.be work, including Shorts and live links.
        </p>
      </section>
    </MediaToolShell>
  );
}
