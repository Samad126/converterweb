"use client";

/**
 * `/pdf/compare` — exactly two PDFs in, a JSON page-by-page diff back, never a
 * download. Modelled after `usePdfMultiFileTool` for the file list, but the
 * response is JSON so it does not reuse that hook's PDF-blob plumbing.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { ConversionFailed } from "./api";
import { type Failure, cancelledFailure, networkFailure } from "./errors";
import { postPdfTool, type PdfHandle } from "./pdfApi";

export type CompareDiffOp = "equal" | "insert" | "delete" | "replace";

export interface CompareDiffChunk {
  op: CompareDiffOp;
  a?: readonly string[];
  b?: readonly string[];
}

export interface ComparePage {
  page: number;
  equal: boolean;
  diff?: readonly CompareDiffChunk[];
}

export interface CompareResult {
  pageCountA: number;
  pageCountB: number;
  pages: readonly ComparePage[];
  extraPagesInA: readonly number[];
  extraPagesInB: readonly number[];
}

export type PdfCompareToolPhase =
  | { name: "ready" }
  | { name: "running" }
  | { name: "done"; result: CompareResult }
  | { name: "failed"; failure: Failure };

export interface PdfCompareTool {
  files: readonly File[];
  phase: PdfCompareToolPhase;
  canRun: boolean;
  addFiles: (files: readonly File[]) => void;
  removeFile: (index: number) => void;
  run: () => void;
  reset: () => void;
}

export function usePdfCompareTool(): PdfCompareTool {
  const [files, setFiles] = useState<readonly File[]>([]);
  const [phase, setPhase] = useState<PdfCompareToolPhase>({ name: "ready" });
  const handleRef = useRef<PdfHandle | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      handleRef.current?.abort();
      handleRef.current = null;
    };
  }, []);

  const addFiles = useCallback((next: readonly File[]): void => {
    if (next.length === 0) return;
    setPhase({ name: "ready" });
    setFiles((current) => [...current, ...next].slice(0, 2));
  }, []);

  const removeFile = useCallback((index: number): void => {
    setPhase({ name: "ready" });
    setFiles((current) => current.filter((_, i) => i !== index));
  }, []);

  const run = useCallback((): void => {
    if (files.length !== 2) return;
    setPhase({ name: "running" });

    const handle = postPdfTool(
      "/pdf/compare",
      files.map((file) => ({ name: "files", value: file, filename: file.name })),
      "json",
    );
    handleRef.current = handle;

    void handle.promise
      .then((response) => {
        if (!mountedRef.current) return;
        handleRef.current = null;
        if (response.kind !== "json") return;
        setPhase({ name: "done", result: response.body as CompareResult });
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
  }, [files]);

  const reset = useCallback((): void => {
    handleRef.current?.abort();
    handleRef.current = null;
    setFiles([]);
    setPhase({ name: "ready" });
  }, []);

  return {
    files,
    phase,
    canRun: files.length === 2 && phase.name === "ready",
    addFiles,
    removeFile,
    run,
    reset,
  };
}

function isAbort(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { name?: unknown }).name === "AbortError";
}
