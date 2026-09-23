"use client";

/**
 * The state machine for one locked `/media/{target}` conversion page —
 * `lib/pdf/usePdfFileTool.ts`'s async cousin.
 *
 * The shape returned is deliberately identical to `PdfFileTool`: this hook
 * drives the same upload → run → result flow, just with a `202` and a poll
 * loop standing where a single request used to be. Returning the same shape
 * means `components/pdf/PdfToolShell.tsx` renders it with no changes at all —
 * "uploading" covers the XHR upload, "processing" covers everything from the
 * `202` to the job turning `done`, which is exactly the distinction that
 * shell already draws.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { ConversionFailed } from "../api/api";
import { downloadMediaJob, fetchMediaJobStatus, startMediaJob, MEDIA_POLL_INTERVAL_MS } from "../api/mediaApi";
import { buildDownloadName } from "../api/contentDisposition";
import { type Failure, cancelledFailure, networkFailure } from "../api/errors";
import { extensionOf, formatBytes } from "../format";
import type { PdfFileTool, PdfToolPhase } from "../pdf/usePdfFileTool";
import type { PdfPart } from "../api/pdfApi";
import { useTicker } from "../hooks/useTicker";

/** 100 MiB — the backend's `MEDIA_MAX_UPLOAD_BYTES`, pinned to the general upload limit. */
const MEDIA_MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

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
  const [phase, setPhase] = useState<PdfToolPhase>({ name: "ready" });
  const [elapsedMs, setElapsedMs] = useState(0);

  const startHandleRef = useRef<{ abort: () => void } | null>(null);
  const pollAbortRef = useRef<AbortController | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const downloadUrlRef = useRef<string | null>(null);
  const startedAtRef = useRef(0);
  const mountedRef = useRef(true);
  const cancelledRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      startHandleRef.current?.abort();
      startHandleRef.current = null;
      pollAbortRef.current?.abort();
      pollAbortRef.current = null;
      if (pollTimerRef.current !== null) clearTimeout(pollTimerRef.current);
      if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
    };
  }, []);

  useTicker(phase.name === "running", () => setElapsedMs(Date.now() - startedAtRef.current));

  const revokeDownloadUrl = useCallback((): void => {
    if (downloadUrlRef.current === null) return;
    URL.revokeObjectURL(downloadUrlRef.current);
    downloadUrlRef.current = null;
  }, []);

  const stopPolling = useCallback((): void => {
    pollAbortRef.current?.abort();
    pollAbortRef.current = null;
    if (pollTimerRef.current !== null) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const selectFile = useCallback(
    (next: File): void => {
      const error = mediaFileError(next, acceptedExtensions);
      if (error) {
        setFileError(error);
        return;
      }
      setFileError(null);
      revokeDownloadUrl();
      setFile(next);
      setPhase({ name: "ready" });
    },
    [acceptedExtensions, revokeDownloadUrl],
  );

  const clearFile = useCallback((): void => {
    setFileError(null);
    revokeDownloadUrl();
    setFile(null);
    setPhase({ name: "ready" });
  }, [revokeDownloadUrl]);

  const finishFailed = useCallback((failure: Failure): void => {
    if (!mountedRef.current) return;
    setPhase({ name: "failed", failure });
  }, []);

  const pollRef = useRef<(jobId: string) => void>(() => {});

  const poll = useCallback(
    (jobId: string): void => {
      const controller = new AbortController();
      pollAbortRef.current = controller;

      void fetchMediaJobStatus(jobId, controller.signal)
        .then((result) => {
          if (!mountedRef.current || cancelledRef.current) return;

          if (result.status === "queued" || result.status === "running") {
            pollTimerRef.current = setTimeout(() => pollRef.current(jobId), MEDIA_POLL_INTERVAL_MS);
            return;
          }

          if (result.status === "failed") {
            finishFailed(result.failure);
            return;
          }

          // done
          void downloadMediaJob(result.downloadUrl, controller.signal)
            .then((downloaded) => {
              if (!mountedRef.current) return;
              const downloadUrl = URL.createObjectURL(downloaded.blob);
              downloadUrlRef.current = downloadUrl;
              setPhase({
                name: "done",
                result: {
                  filename: buildDownloadName(downloaded.disposition, downloadExtension),
                  byteSize: downloaded.blob.size,
                  downloadUrl,
                  blob: downloaded.blob,
                },
              });
            })
            .catch((error: unknown) => {
              if (!mountedRef.current) return;
              finishFailed(
                error instanceof ConversionFailed
                  ? error.failure
                  : isAbort(error)
                    ? cancelledFailure()
                    : networkFailure(),
              );
            });
        })
        .catch((error: unknown) => {
          if (!mountedRef.current || cancelledRef.current) return;
          if (isAbort(error)) return;
          finishFailed(networkFailure());
        });
    },
    [downloadExtension, finishFailed],
  );

  useEffect(() => {
    pollRef.current = poll;
  }, [poll]);

  const run = useCallback(
    (_extraParts?: readonly PdfPart[]): void => {
      if (!file) return;
      cancelledRef.current = false;
      revokeDownloadUrl();
      setElapsedMs(0);
      startedAtRef.current = Date.now();
      setPhase({ name: "running", stage: "uploading", loaded: 0, total: file.size });

      const handle = startMediaJob(target, file, {
        onUploadProgress: (loaded, total) => {
          setPhase((current) =>
            current.name === "running" && current.stage === "uploading"
              ? { name: "running", stage: "uploading", loaded, total }
              : current,
          );
        },
        onUploadComplete: () => {
          setPhase((current) =>
            current.name === "running" ? { ...current, stage: "processing" } : current,
          );
        },
      });
      startHandleRef.current = handle;

      void handle.promise
        .then((started) => {
          if (!mountedRef.current) return;
          startHandleRef.current = null;
          setPhase((current) =>
            current.name === "running" ? { ...current, stage: "processing" } : current,
          );
          poll(started.id);
        })
        .catch((error: unknown) => {
          if (!mountedRef.current) return;
          startHandleRef.current = null;
          finishFailed(
            error instanceof ConversionFailed
              ? error.failure
              : isAbort(error)
                ? cancelledFailure()
                : networkFailure(),
          );
        });
    },
    [file, target, revokeDownloadUrl, poll, finishFailed],
  );

  const cancel = useCallback((): void => {
    cancelledRef.current = true;
    startHandleRef.current?.abort();
    stopPolling();
    finishFailed(cancelledFailure());
  }, [stopPolling, finishFailed]);

  const reset = useCallback((): void => {
    cancelledRef.current = true;
    startHandleRef.current?.abort();
    startHandleRef.current = null;
    stopPolling();
    revokeDownloadUrl();
    setElapsedMs(0);
    setFile(null);
    setPhase({ name: "ready" });
  }, [stopPolling, revokeDownloadUrl]);

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

function isAbort(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { name?: unknown }).name === "AbortError";
}
