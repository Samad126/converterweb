"use client";

import { useEffect } from "react";

import { reportError } from "@/lib/telemetry/reportError";

/** Reports errors that escape React: uncaught throws and unhandled rejections. */
export function GlobalErrorReporter(): null {
  useEffect(() => {
    const onError = (e: ErrorEvent): void => reportError(e.error ?? e.message, "window");
    const onRejection = (e: PromiseRejectionEvent): void => reportError(e.reason, "rejection");
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
