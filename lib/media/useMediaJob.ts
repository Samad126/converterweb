"use client";

/**
 * The job lifecycle every `/audio`, `/video` and YouTube page runs: start a
 * job, poll it until it says `done` or `failed`, then fetch the file.
 *
 * What differs between a file tool and a link tool is only how the job is
 * started, so that is the one thing a caller supplies. Everything after the
 * `202` lives here once. `useMediaTool` and `useYouTubeTool` are thin wrappers
 * around it that add only their own input.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { ConversionFailed } from "../api/api";
import { buildDownloadName } from "../api/contentDisposition";
import { type Failure, cancelledFailure, networkFailure } from "../api/errors";
import {
  MEDIA_POLL_INTERVAL_MS,
  type MediaJobStartHandle,
  type MediaStartCallbacks,
  downloadMediaJob,
  fetchMediaJobStatus,
} from "../api/mediaApi";
import { useTicker } from "../hooks/useTicker";
import type { PdfToolPhase } from "../pdf/usePdfFileTool";

/** What a page renders for one run: where it is, how long it has taken, and what the person can do to it. */
export interface MediaRun {
  phase: PdfToolPhase;
  elapsedMs: number;
  cancel: () => void;
  /** Back to ready, with no result and no failure. Whatever the page's own input holds is the page's call. */
  reset: () => void;
}

/** Starts one job. The handle carries its id once the server has accepted it, and the means to cancel it. */
export type MediaStart = (callbacks: MediaStartCallbacks) => MediaJobStartHandle;

export interface MediaJob extends MediaRun {
  /**
   * Starts a run. `uploadBytes` is the size of the file being sent, so the
   * phase can report an upload, or `null` for a job started from a link, which
   * has nothing to upload and goes straight to processing.
   */
  begin: (start: MediaStart, uploadBytes: number | null) => void;
}

export function useMediaJob(downloadExtension: string): MediaJob {
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

  const begin = useCallback(
    (start: MediaStart, uploadBytes: number | null): void => {
      cancelledRef.current = false;
      revokeDownloadUrl();
      setElapsedMs(0);
      startedAtRef.current = Date.now();
      setPhase(
        uploadBytes === null
          ? { name: "running", stage: "processing", loaded: 0, total: null }
          : { name: "running", stage: "uploading", loaded: 0, total: uploadBytes },
      );

      const handle = start({
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
    [poll, finishFailed, revokeDownloadUrl],
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
    setPhase({ name: "ready" });
  }, [stopPolling, revokeDownloadUrl]);

  return { phase, elapsedMs, begin, cancel, reset };
}

function isAbort(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { name?: unknown }).name === "AbortError";
}
