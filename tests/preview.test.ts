import { describe, expect, it } from "vitest";

import { buildPreviewDocument, escapeHtml } from "@/lib/preview";

describe("the preview document", () => {
  it("escapes a text target, so markup in the file is shown and not parsed", () => {
    const document_ = buildPreviewDocument(
      "<script>alert(1)</script>\nplain & simple",
      false,
    );

    expect(document_).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(document_).toContain("plain &amp; simple");
    // The only <script> that could appear is one that was not escaped.
    expect(document_).not.toContain("<script>alert");
    expect(document_).toContain("<pre");
  });

  it("inserts an html target as markup, because the sandbox is the protection", () => {
    const document_ = buildPreviewDocument("<p>Quarterly &amp; annual</p>", true);

    expect(document_).toContain("<p>Quarterly &amp; annual</p>");
    expect(document_).not.toContain("&lt;p&gt;");
  });

  it("is a complete document that carries its own two themes", () => {
    const document_ = buildPreviewDocument("hello", false);

    expect(document_.startsWith("<!doctype html>")).toBe(true);
    expect(document_).toContain('lang="en"');
    expect(document_).toContain('charset="utf-8"');
    // The frame cannot see the page's custom properties, so it brings its own.
    expect(document_).toContain("prefers-color-scheme:dark");
    expect(document_).toContain("--ink:#000");
    expect(document_).toContain("--ink:#fff");
  });

  it("asks for no referrer and loads nothing", () => {
    const document_ = buildPreviewDocument("hello", false);

    expect(document_).toContain('name="referrer" content="no-referrer"');
    expect(document_).not.toContain("http://");
    expect(document_).not.toContain("https://");
    expect(document_).not.toContain("<script");
  });
});

describe("escapeHtml", () => {
  it("escapes the five characters that change meaning", () => {
    expect(escapeHtml(`& < > " '`)).toBe("&amp; &lt; &gt; &quot; &#39;");
  });

  it("escapes the ampersand first, so nothing is double-escaped", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });
});
