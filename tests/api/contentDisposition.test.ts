import { describe, expect, it } from "vitest";

import {
  buildDownloadName,
  parseContentDispositionFilename,
  sanitizeFilename,
} from "@/lib/api/contentDisposition";

describe("parseContentDispositionFilename", () => {
  it("prefers filename* over the ASCII filename when both are present", () => {
    // The exact header the contract documents. Both parameters name the same
    // file here, so the test also proves which one was read by making the
    // ASCII form a different name.
    expect(
      parseContentDispositionFilename(
        `attachment; filename="Quarterly report.pdf"; filename*=UTF-8''Quarterly%20report.pdf`,
      ),
    ).toBe("Quarterly report.pdf");

    expect(
      parseContentDispositionFilename(
        `attachment; filename="fallback.pdf"; filename*=UTF-8''preferred.pdf`,
      ),
    ).toBe("preferred.pdf");
  });

  it("decodes a percent-encoded UTF-8 name", () => {
    expect(
      parseContentDispositionFilename(
        "attachment; filename*=UTF-8''Quarterly%20report.pdf",
      ),
    ).toBe("Quarterly report.pdf");
  });

  it("strips the language tag before decoding", () => {
    expect(
      parseContentDispositionFilename(
        "attachment; filename*=UTF-8'en'Quarterly%20report.pdf",
      ),
    ).toBe("Quarterly report.pdf");
  });

  it("handles a non-ASCII name", () => {
    // Percent-encoded UTF-8 for "État financier – 2026.pdf".
    expect(
      parseContentDispositionFilename(
        "attachment; filename*=UTF-8''%C3%89tat%20financier%20%E2%80%93%202026.pdf",
      ),
    ).toBe("État financier – 2026.pdf");

    // And the same name in the ASCII parameter, which can only be read as-is.
    expect(
      parseContentDispositionFilename('attachment; filename="État financier.pdf"'),
    ).toBe("État financier.pdf");
  });

  it("accepts both quoted and unquoted parameters, and either case", () => {
    expect(parseContentDispositionFilename("attachment; filename=plain.pdf")).toBe("plain.pdf");
    expect(parseContentDispositionFilename('attachment; FILENAME="Shouty.pdf"')).toBe("Shouty.pdf");
  });

  it("returns null when there is nothing to read", () => {
    expect(parseContentDispositionFilename(null)).toBeNull();
    expect(parseContentDispositionFilename(undefined)).toBeNull();
    expect(parseContentDispositionFilename("")).toBeNull();
    expect(parseContentDispositionFilename("attachment")).toBeNull();
    expect(parseContentDispositionFilename('attachment; filename=""')).toBeNull();
  });
});

describe("sanitizeFilename", () => {
  it("never returns a path", () => {
    expect(sanitizeFilename("../../etc/passwd.pdf")).toBe("passwd.pdf");
    expect(sanitizeFilename("C:\\Windows\\System32\\config.pdf")).toBe("config.pdf");
    expect(sanitizeFilename("/absolute/path/report.pdf")).toBe("report.pdf");
  });

  it("drops control characters and bidi overrides", () => {
    expect(sanitizeFilename("report\u0000\u001b.pdf")).toBe("report.pdf");
    // "annexe\u202Efdp.exe" renders as "annexeexe.pdf" in a file manager.
    expect(sanitizeFilename("annexe\u202Efdp.exe")).toBe("annexefdp.exe");
  });

  it("refuses the names that mean something to a filesystem", () => {
    expect(sanitizeFilename(".")).toBe("");
    expect(sanitizeFilename("..")).toBe("");
    expect(sanitizeFilename("...")).toBe("");
    expect(sanitizeFilename("   ")).toBe("");
    expect(sanitizeFilename("trailing. ")).toBe("trailing");
    expect(sanitizeFilename(".hidden.pdf")).toBe("hidden.pdf");
  });
});

describe("buildDownloadName", () => {
  it("gives the uploaded name the target's extension", () => {
    expect(
      buildDownloadName(
        `attachment; filename="Quarterly report.docx"; filename*=UTF-8''Quarterly%20report.docx`,
        ".pdf",
      ),
    ).toBe("Quarterly report.pdf");
  });

  it("uses the archive extension for an archive target, whatever the header says", () => {
    // The server echoes the image extension on a ZIP response.
    expect(
      buildDownloadName('attachment; filename="Deck.png"', ".zip"),
    ).toBe("Deck.zip");
  });

  it("falls back to converted.<ext> when the header is absent", () => {
    expect(buildDownloadName(null, ".pdf")).toBe("converted.pdf");
    expect(buildDownloadName(undefined, ".zip")).toBe("converted.zip");
    expect(buildDownloadName("attachment", ".txt")).toBe("converted.txt");
  });

  it("falls back to converted.<ext> when the header is unusable", () => {
    expect(buildDownloadName('attachment; filename=""', ".pdf")).toBe("converted.pdf");
    expect(buildDownloadName('attachment; filename=".."', ".pdf")).toBe("converted.pdf");
    expect(buildDownloadName('attachment; filename="../../../"', ".pdf")).toBe("converted.pdf");
    expect(buildDownloadName('attachment; filename="   "', ".zip")).toBe("converted.zip");
  });

  it("reads a leading dot as a dotfile, not as an extension", () => {
    // ".pdf" has no extension by the rule that the last dot after the first
    // character starts one, so its whole name is the stem. The result is odd
    // and it is unreachable: a file actually called ".pdf" has no extension
    // for `GET /formats` to match, so this client rejects it before upload.
    expect(buildDownloadName('attachment; filename=".pdf"', ".pdf")).toBe("pdf.pdf");
  });

  it("keeps a name that only needed sanitising", () => {
    expect(buildDownloadName('attachment; filename="../../report.pdf"', ".pdf")).toBe(
      "report.pdf",
    );
    expect(buildDownloadName("attachment; filename*=UTF-8''%C3%89tat.pdf", ".docx")).toBe(
      "État.docx",
    );
  });
});
