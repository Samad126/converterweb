"use client";

/**
 * The state machine shared by the simplest `/pdf/*` tools: one PDF in, plus a
 * handful of scalar fields, and a PDF back out.
 *
 * This is `lib/converter/useConverter.ts`'s smaller sibling. It is not that hook made
 * generic — there is no matrix to fetch and no target to pick, so the shape is
 * simpler on purpose — but it borrows the same three disciplines: the object
 * URL is created once and revoked on unmount/reset/before the next run, a
 * failure is a normal event and never retried on its own, and the server's
 * sentence is shown verbatim.
 *
 * Tools whose response is JSON rather than a PDF (`compare`, `form-fields`)
 * do not use this hook — their shape differs enough (no single download) that
 * forcing them through it would cost more than it saves. They call
 * `postPdfTool` directly.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { ConversionFailed } from "../api/api";
import { type PdfPart, postPdfTool, type PdfHandle } from "../api/pdfApi";
import { buildDownloadName } from "../api/contentDisposition";
import { type Failure, cancelledFailure, networkFailure } from "../api/errors";
import { pdfToolFileError } from "./pdfFileValidation";
import { useTicker } from "../hooks/useTicker";

export type PdfToolPhase =
  | { name: "ready" }
  | { name: "running"; stage: "uploading" | "processing"; loaded: number; total: number | null }
  | { name: "done"; result: PdfToolResult }
  | { name: "failed"; failure: Failure };

export interface PdfToolResult {
  filename: string;
  byteSize: number;
  downloadUrl: string;
  blob: Blob;
}

export interface PdfFileTool {
  file: File | null;
  /** Why the last `selectFile` was refused, if it was. Cleared by the next attempt. */
  fileError: string | null;
  phase: PdfToolPhase;
  elapsedMs: number;
  canRun: boolean;
  selectFile: (file: File) => void;
  clearFile: () => void;
  /** Builds the extra multipart fields at the moment of submission. */
  run: (extraParts?: readonly PdfPart[]) => void;
  cancel: () => void;
  reset: () => void;
}

export interface PdfFileToolOptions {
  /**
   * The `Content-Type` and extension of a successful response.
   *
   * Every tool but `/pdf/split` answers with a PDF; `/pdf/split` always
   * answers with a ZIP of parts, even for a single part. Defaults to the
   * common case.
   */
  responseMediaType?: string;
  downloadExtension?: string;
  /** The extensions `selectFile` accepts, dot-prefixed. Defaults to `[".pdf"]`. */
  acceptedExtensions?: readonly string[];
}

export function usePdfFileTool(path: string, options: PdfFileToolOptions = {}): PdfFileTool {
  const {
    responseMediaType = "application/pdf",
    downloadExtension = ".pdf",
    acceptedExtensions = [".pdf"],
  } = options;
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [phase, setPhase] = useState<PdfToolPhase>({ name: "ready" });
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

  useTicker(phase.name === "running", () => setElapsedMs(Date.now() - startedAtRef.current));

  const revokeDownloadUrl = useCallback((): void => {
    if (downloadUrlRef.current === null) return;
    URL.revokeObjectURL(downloadUrlRef.current);
    downloadUrlRef.current = null;
  }, []);

  const selectFile = useCallback(
    (next: File): void => {
      const error = pdfToolFileError(next, acceptedExtensions);
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

  const run = useCallback(
    (extraParts: readonly PdfPart[] = []): void => {
      if (!file) return;
      revokeDownloadUrl();
      setElapsedMs(0);
      startedAtRef.current = Date.now();
      setPhase({ name: "running", stage: "uploading", loaded: 0, total: file.size });

      const parts: PdfPart[] = [
        { name: "file", value: file, filename: file.name },
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
    [file, path, revokeDownloadUrl, responseMediaType, downloadExtension],
  );

  const cancel = useCallback((): void => {
    handleRef.current?.abort();
  }, []);

  const reset = useCallback((): void => {
    handleRef.current?.abort();
    handleRef.current = null;
    revokeDownloadUrl();
    setElapsedMs(0);
    setFile(null);
    setPhase({ name: "ready" });
  }, [revokeDownloadUrl]);

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
