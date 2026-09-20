"use client";

/**
 * `/pdf/form-fields` (list) then `/pdf/fill-form` (fill) — the one `/pdf/*`
 * tool that is two requests against the same uploaded file rather than one:
 * the file is read into memory once and never re-uploaded for step two.
 *
 * An empty field list is not a failure — most PDFs have no AcroForm at all —
 * so `"listed"` with `fields: []` is a normal state the component renders as
 * "no fillable fields", not an error.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { ConversionFailed } from "./api";
import { buildDownloadName } from "./contentDisposition";
import { type Failure, cancelledFailure, networkFailure } from "./errors";
import { type PdfPart, postPdfTool, type PdfHandle } from "./pdfApi";

export type FormFieldType =
  | "text"
  | "checkbox"
  | "radio"
  | "dropdown"
  | "optionList"
  | "button"
  | "unknown";

export interface FormField {
  name: string;
  type: FormFieldType;
  value?: unknown;
  options?: readonly string[];
}

export type PdfFormFieldsPhase =
  | { name: "ready" }
  | { name: "listing" }
  | { name: "listed"; fields: readonly FormField[] }
  | { name: "filling" }
  | { name: "done"; result: PdfFormFieldsResult }
  | { name: "failed"; failure: Failure };

export interface PdfFormFieldsResult {
  filename: string;
  byteSize: number;
  downloadUrl: string;
  blob: Blob;
}

export interface PdfFormFieldsTool {
  file: File | null;
  phase: PdfFormFieldsPhase;
  selectFile: (file: File) => void;
  clearFile: () => void;
  /** Fires `POST /pdf/form-fields` for the chosen file. */
  list: () => void;
  /** Fires `POST /pdf/fill-form` with the touched field values. */
  fill: (values: Record<string, string | boolean>, flatten: boolean) => void;
  reset: () => void;
}

export function usePdfFormFieldsTool(): PdfFormFieldsTool {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<PdfFormFieldsPhase>({ name: "ready" });

  const handleRef = useRef<PdfHandle | null>(null);
  const downloadUrlRef = useRef<string | null>(null);
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

  const revokeDownloadUrl = useCallback((): void => {
    if (downloadUrlRef.current === null) return;
    URL.revokeObjectURL(downloadUrlRef.current);
    downloadUrlRef.current = null;
  }, []);

  const selectFile = useCallback(
    (next: File): void => {
      revokeDownloadUrl();
      setFile(next);
      setPhase({ name: "ready" });
    },
    [revokeDownloadUrl],
  );

  const clearFile = useCallback((): void => {
    revokeDownloadUrl();
    setFile(null);
    setPhase({ name: "ready" });
  }, [revokeDownloadUrl]);

  const fail = useCallback((error: unknown): void => {
    if (!mountedRef.current) return;
    handleRef.current = null;
    const failure =
      error instanceof ConversionFailed
        ? error.failure
        : isAbort(error)
          ? cancelledFailure()
          : networkFailure();
    setPhase({ name: "failed", failure });
  }, []);

  const list = useCallback((): void => {
    if (!file) return;
    setPhase({ name: "listing" });

    const handle = postPdfTool(
      "/pdf/form-fields",
      [{ name: "file", value: file, filename: file.name }],
      "json",
    );
    handleRef.current = handle;

    void handle.promise
      .then((response) => {
        if (!mountedRef.current) return;
        handleRef.current = null;
        if (response.kind !== "json") return;
        const fields = Array.isArray(response.body) ? (response.body as FormField[]) : [];
        setPhase({ name: "listed", fields });
      })
      .catch(fail);
  }, [file, fail]);

  const fill = useCallback(
    (values: Record<string, string | boolean>, flatten: boolean): void => {
      if (!file) return;
      revokeDownloadUrl();
      setPhase({ name: "filling" });

      const parts: PdfPart[] = [
        { name: "file", value: file, filename: file.name },
        { name: "fields", value: JSON.stringify(values) },
        { name: "flatten", value: flatten ? "true" : "false" },
      ];

      const handle = postPdfTool("/pdf/fill-form", parts, "pdf");
      handleRef.current = handle;

      void handle.promise
        .then((response) => {
          if (!mountedRef.current) return;
          handleRef.current = null;
          if (response.kind !== "pdf") return;

          const downloadUrl = URL.createObjectURL(response.blob);
          downloadUrlRef.current = downloadUrl;
          setPhase({
            name: "done",
            result: {
              filename: buildDownloadName(response.disposition, ".pdf"),
              byteSize: response.blob.size,
              downloadUrl,
              blob: response.blob,
            },
          });
        })
        .catch(fail);
    },
    [file, revokeDownloadUrl, fail],
  );

  const reset = useCallback((): void => {
    handleRef.current?.abort();
    handleRef.current = null;
    revokeDownloadUrl();
    setFile(null);
    setPhase({ name: "ready" });
  }, [revokeDownloadUrl]);

  return { file, phase, selectFile, clearFile, list, fill, reset };
}

function isAbort(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { name?: unknown }).name === "AbortError";
}
