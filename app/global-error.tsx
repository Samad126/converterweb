"use client";

import { useEffect } from "react";

import { reportError } from "@/lib/telemetry/reportError";

/** Replaces the root layout, so it brings its own <html> and no stylesheet. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  useEffect(() => {
    reportError(error, "global");
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "3rem 1rem", maxWidth: 640, margin: "0 auto" }}>
        <h1>Something went wrong</h1>
        <p>The site hit an unexpected error. No file was kept.</p>
        <button type="button" onClick={reset}>
          Try again
        </button>
      </body>
    </html>
  );
}
