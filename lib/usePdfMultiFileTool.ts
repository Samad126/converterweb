"use client";

/**
 * `usePdfFileTool`'s sibling for the two `/pdf/*` tools that take several
 * files under one repeated field name — `merge` (two or more PDFs) and
 * `scan-to-pdf` (one or more images) — rather than the single `file` every
 * other tool takes.
 *
 * The order the files are chosen in is significant for both tools (the pages
 * come out in upload order), so this keeps an ordered list rather than a set,
 * with `moveFile` to reorder it and `removeFile` to drop one.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { ConversionFailed } from "./api";
import { buildDownloadName } from "./contentDisposition";
import { type Failure, cancelledFailure, networkFailure } from "./errors";
import { type PdfPart, postPdfTool, type PdfHandle } from "./pdfApi";

export type PdfMultiToolPhase =
  | { name: "ready" }
  | { name: "running"; stage: "uploading" | "processing"; loaded: number; total: number | null }
  | { name: "done"; result: PdfMultiToolResult }
  | { name: "failed"; failure: Failure };

export interface PdfMultiToolResult {
  filename: string;
  byteSize: number;
  downloadUrl: string;
  blob: Blob;
}

export interface PdfMultiFileTool {
  files: readonly File[];
  phase: PdfMultiToolPhase;
  elapsedMs: number;
  canRun: boolean;
  addFiles: (files: readonly File[]) => void;
  removeFile: (index: number) => void;
  moveFile: (index: number, direction: -1 | 1) => void;
  run: (extraParts?: readonly PdfPart[]) => void;
  cancel: () => void;
  reset: () => void;
}

export interface PdfMultiFileToolOptions {
  /** The multipart field name every file is sent under. Defaults to `files`. */
  fieldName?: string;
  /** How many files `run` needs before it will fire. Defaults to `1`. */
  minFiles?: number;
  responseMediaType?: string;
  downloadExtension?: string;
}

export function usePdfMultiFileTool(
  path: string,
  options: PdfMultiFileToolOptions = {},
): PdfMultiFileTool {
  const {
    fieldName = "files",
    minFiles = 1,
    responseMediaType = "application/pdf",
    downloadExtension = ".pdf",
  } = options;

  const [files, setFiles] = useState<readonly File[]>([]);
  const [phase, setPhase] = useState<PdfMultiToolPhase>({ name: "ready" });
  const [elapsedMs, setElapsedMs] = useState(0);

  const handleRef = useRef<PdfHandle | null>(null);
  const downloadUrlRef = useRef<string | null>(null);
  const startedAtRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      handleRef.current?.abort();
      handleRef.current = null;
      if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase.name !== "running") return;
    const id = setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 100);
    return () => clearInterval(id);
  }, [phase.name]);

  const revokeDownloadUrl = useCallback((): void => {
    if (downloadUrlRef.current === null) return;
    URL.revokeObjectURL(downloadUrlRef.current);
    downloadUrlRef.current = null;
  }, []);

  const addFiles = useCallback(
    (next: readonly File[]): void => {
      if (next.length === 0) return;
      revokeDownloadUrl();
      setPhase({ name: "ready" });
      setFiles((current) => [...current, ...next]);
    },
    [revokeDownloadUrl],
  );

  const removeFile = useCallback(
    (index: number): void => {
      revokeDownloadUrl();
      setPhase({ name: "ready" });
      setFiles((current) => current.filter((_, i) => i !== index));
    },
    [revokeDownloadUrl],
  );

  const moveFile = useCallback((index: number, direction: -1 | 1): void => {
    setFiles((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(index, 1);
      if (moved === undefined) return current;
      next.splice(target, 0, moved);
      return next;
    });
  }, []);

  const run = useCallback(
    (extraParts: readonly PdfPart[] = []): void => {
      if (files.length < minFiles) return;
      revokeDownloadUrl();
      setElapsedMs(0);
      startedAtRef.current = Date.now();
      const total = files.reduce((sum, file) => sum + file.size, 0);
      setPhase({ name: "running", stage: "uploading", loaded: 0, total });

      const parts: PdfPart[] = [
        ...files.map((file): PdfPart => ({ name: fieldName, value: file, filename: file.name })),
        ...extraParts,
      ];

      const handle = postPdfTool(
        path,
        parts,
        "pdf",
        {
          onUploadProgress: (progress) => {
            setPhase((current) =>
              current.name === "running" && current.stage === "uploading"
                ? { name: "running", stage: "uploading", loaded: progress.loaded, total: progress.total }
                : current,
            );
          },
          onUploadComplete: () => {
            setPhase((current) =>
              current.name === "running" ? { ...current, stage: "processing" } : current,
            );
          },
        },
        responseMediaType,
      );
      handleRef.current = handle;

      void handle.promise
        .then((response) => {
          if (!mountedRef.current) return;
          handleRef.current = null;
          if (response.kind !== "pdf") return; // Not reachable for a "pdf" expectation.

          const downloadUrl = URL.createObjectURL(response.blob);
          downloadUrlRef.current = downloadUrl;
          setPhase({
            name: "done",
            result: {
              filename: buildDownloadName(response.disposition, downloadExtension),
              byteSize: response.blob.size,
              downloadUrl,
              blob: response.blob,
            },
          });
        })
        .catch((error: unknown) => {
          if (!mountedRef.current) return;
          handleRef.current = null;
          const failure =
            error instanceof ConversionFailed
              ? error.failure
              : isAbort(error)
                ? cancelledFailure()
                : networkFailure();
          setPhase({ name: "failed", failure });
        });
    },
    [files, path, fieldName, minFiles, revokeDownloadUrl, responseMediaType, downloadExtension],
  );

  const cancel = useCallback((): void => {
    handleRef.current?.abort();
  }, []);

  const reset = useCallback((): void => {
    handleRef.current?.abort();
    handleRef.current = null;
    revokeDownloadUrl();
    setElapsedMs(0);
    setFiles([]);
    setPhase({ name: "ready" });
  }, [revokeDownloadUrl]);

  return {
    files,
    phase,
    elapsedMs,
    canRun: files.length >= minFiles && phase.name === "ready",
    addFiles,
    removeFile,
    moveFile,
    run,
    cancel,
    reset,
  };
}

function isAbort(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { name?: unknown }).name === "AbortError";
}
