/**
 * The sandboxed preview of a text or HTML conversion.
 *
 * The document is loaded with `srcdoc` into an iframe whose `sandbox` attribute
 * is the empty string. That is the entire security model and it is not
 * negotiable: no `allow-scripts`, no `allow-same-origin`, no `allow-forms`, no
 * `allow-top-navigation`. A converted document is untrusted input that has been
 * through a converter, and the browser's job is to render it as a picture, not
 * to run it.
 *
 * `srcdoc` rather than a blob URL, because a blob URL inherits this page's
 * origin and a sandboxed frame cannot load it. The escaping below is the only
 * content-modifying step, and it applies to the text targets only: an `html`
 * target is inserted as-is, precisely because the sandbox is what makes that
 * safe.
 */

/**
 * A complete, self-contained document for the preview frame.
 *
 * Styled in the same achromatic tokens as the app, and with a colour-scheme
 * query of its own — the frame cannot see the page's custom properties, so it
 * has to carry its own two-theme rules or it would be a white rectangle on a
 * black page.
 */
export function buildPreviewDocument(text: string, isHtml: boolean): string {
  const body = isHtml
    ? text
    : `<pre class="text">${escapeHtml(text)}</pre>`;

  return [
    "<!doctype html>",
    '<html lang="en"><head><meta charset="utf-8">',
    '<meta name="referrer" content="no-referrer">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<style>",
    ":root{color-scheme:light dark;--ink:#000;--paper:#fff;--rule:#e5e5e5}",
    "@media (prefers-color-scheme:dark){:root{--ink:#fff;--paper:#000;--rule:#171717}}",
    "html,body{margin:0;background:var(--paper);color:var(--ink)}",
    "body{font:400 14px/1.6 ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;padding:16px}",
    ".text{margin:0;font:400 13px/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere}",
    "img,table{max-width:100%}",
    "hr{border:0;border-top:1px solid var(--rule)}",
    "</style></head><body>",
    body,
    "</body></html>",
  ].join("");
}

/** The five characters that change meaning inside HTML text and attributes. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
