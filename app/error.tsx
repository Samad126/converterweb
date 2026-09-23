"use client";

import { useEffect } from "react";

import { reportError } from "@/lib/telemetry/reportError";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  useEffect(() => {
    reportError(error, "route");
  }, [error]);

  return (
    <main id="content" className="shell py-10 sm:py-14">
      <h1 className="page-title">Something went wrong</h1>
      <p className="page-lede">
        The page hit an unexpected error. No file was kept. Try again, or reload the page.
      </p>
      <button type="button" className="btn-quiet mt-6" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
