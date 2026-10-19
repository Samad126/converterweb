"use client";

/**
 * The state machine for one locked `/media/{target}` conversion page —
 * `lib/pdf/usePdfFileTool.ts`'s async cousin.
 *
 * The shape returned is deliberately identical to `PdfFileTool`, so the shell
 * that renders it does not care whether the job came from a file or a link.
 * This hook is only the file input: it picks and checks the file, then hands
 * the upload to `useMediaJob`, which owns the poll loop and the download.
 */
import { useCallback, useState } from "react";

import { startMediaJob } from "../api/mediaApi";
import { extensionOf, formatBytes } from "../format";
import type { PdfFileTool } from "../pdf/usePdfFileTool";
import { useMediaJob } from "./useMediaJob";

/** 100 MiB — the backend's `MEDIA_MAX_UPLOAD_BYTES`, pinned to the general upload limit. */
export const MEDIA_MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

function mediaFileError(file: File, acceptedExtensions: readonly string[]): string | null {
  const extension = extensionOf(file.name);
  if (!acceptedExtensions.includes(extension)) {
    const described = extension === "" ? "has no file extension" : `is a ${extension} file`;
    return `${file.name} ${described}, which this tool does not accept. Accepted: ${acceptedExtensions.join(", ")}.`;
  }
  if (file.size > MEDIA_MAX_UPLOAD_BYTES) {
    return `${file.name} is ${formatBytes(file.size)}. The largest file this tool accepts is ${formatBytes(MEDIA_MAX_UPLOAD_BYTES)}.`;
  }
  return null;
}

export function useMediaTool(target: string, acceptedExtensions: readonly string[], downloadExtension: string): PdfFileTool {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const job = useMediaJob(downloadExtension);
  const { begin, cancel, phase, elapsedMs, reset: resetJob } = job;

  const selectFile = useCallback(
    (next: File): void => {
      const error = mediaFileError(next, acceptedExtensions);
      if (error) {
        setFileError(error);
        return;
      }
      setFileError(null);
      resetJob();
      setFile(next);
    },
    [acceptedExtensions, resetJob],
  );

  const clearFile = useCallback((): void => {
    setFileError(null);
    resetJob();
    setFile(null);
  }, [resetJob]);

  const run = useCallback((): void => {
    if (!file) return;
    begin((callbacks) => startMediaJob(target, file, callbacks), file.size);
  }, [file, target, begin]);

  const reset = useCallback((): void => {
    resetJob();
    setFile(null);
  }, [resetJob]);

  return {
    file,
    fileError,
    phase,
    elapsedMs,
    canRun: file !== null && phase.name === "ready",
    selectFile,
    clearFile,
    run,
    cancel,
    reset,
  };
}
