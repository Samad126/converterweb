/**
 * The one place client-side errors are reported.
 *
 * Logs to the console and, when `NEXT_PUBLIC_ERROR_REPORT_URL` is set, sends a
 * small JSON beacon there. Nothing is sent by default, and never file contents
 * or names — only the message, digest and stack.
 */
export function reportError(error: unknown, context = "client"): void {
  console.error(`[${context}]`, error);
  const url = process.env.NEXT_PUBLIC_ERROR_REPORT_URL;
  if (!url || typeof navigator === "undefined") return;
  const e = error instanceof Error ? error : new Error(String(error));
  const digest = (e as { digest?: string }).digest;
  try {
    navigator.sendBeacon(
      url,
      JSON.stringify({ context, message: e.message, digest, stack: e.stack, path: location.pathname }),
    );
  } catch {
    // Reporting must never throw.
  }
}
