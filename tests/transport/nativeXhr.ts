/**
 * jsdom's own `XMLHttpRequest`, captured before MSW replaces the global.
 *
 * Two things cannot be tested through MSW's XHR interceptor, and both of them
 * matter here:
 *
 *   1. Cancellation. The interceptor implements no `abort()` at all — the word
 *      appears in its bundle only in a list of event names — so a cancelled
 *      request is never reported as cancelled. The 120 second deadline and the
 *      Cancel button are both built on exactly that.
 *   2. The bytes on the wire. Asking a handler for `request.formData()` tells
 *      you what the interceptor reconstructed, not what was sent.
 *
 * So those tests talk to a real HTTP server over jsdom's real `XMLHttpRequest`,
 * captured here while the global still points at it. The assertion they make is
 * stronger for it: the multipart body is parsed out of the actual request, and
 * an abort is observed as the connection actually dropping.
 *
 * The symbol is looked up rather than the value, so it does not matter whether
 * this module or the setup file is evaluated first.
 */
export const NATIVE_XHR = Symbol.for("converter.test.native-xmlhttprequest");

/** Called from `vitest.setup.ts`, before MSW patches anything. */
export function captureNativeXhr(xhr: unknown): void {
  (globalThis as unknown as Record<symbol, unknown>)[NATIVE_XHR] = xhr;
}

/** jsdom's `XMLHttpRequest`, or `undefined` if it was never captured. */
export function getNativeXhr(): typeof XMLHttpRequest | undefined {
  return (globalThis as unknown as Record<symbol, unknown>)[NATIVE_XHR] as
    | typeof XMLHttpRequest
    | undefined;
}
