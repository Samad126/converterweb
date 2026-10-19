"use client";

/**
 * The state of one YouTube conversion page: the link the person pasted, and
 * the job that link starts.
 *
 * This is `useMediaTool`'s counterpart for a link rather than a file. The link
 * is only trimmed here, then sent exactly as typed: the service reduces it to
 * one video id, and a second parser in this app could only disagree with it.
 * Editing the link after a failure clears that failure, because the failure
 * was about the old link and the person has just changed it.
 */
import { useCallback, useState } from "react";

import type { YouTubeTargetId } from "../api/contract";
import { startYouTubeJob } from "../api/mediaApi";
import { type MediaRun, useMediaJob } from "./useMediaJob";

export interface YouTubeTool extends MediaRun {
  link: string;
  setLink: (link: string) => void;
  /** A link is in the box and no job is running or waiting to be fetched. */
  canRun: boolean;
  run: () => void;
}

export function useYouTubeTool(target: YouTubeTargetId, downloadExtension: string): YouTubeTool {
  const [link, setLinkState] = useState("");
  const job = useMediaJob(downloadExtension);
  const { begin, reset } = job;
  const failed = job.phase.name === "failed";

  const setLink = useCallback(
    (next: string): void => {
      setLinkState(next);
      if (failed) reset();
    },
    [failed, reset],
  );

  const trimmed = link.trim();

  const run = useCallback((): void => {
    if (trimmed === "") return;
    begin(() => startYouTubeJob(target, trimmed), null);
  }, [trimmed, target, begin]);

  return {
    link,
    setLink,
    phase: job.phase,
    elapsedMs: job.elapsedMs,
    canRun: trimmed !== "" && job.phase.name === "ready",
    run,
    cancel: job.cancel,
    reset,
  };
}
