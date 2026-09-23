import { describe, expect, it } from "vitest";

import {
  extensionOf,
  formatBytes,
  formatCountdown,
  formatDuration,
  stripExtension,
} from "@/lib/format";

describe("formatBytes", () => {
  it("uses the units the contract uses, so the two agree", () => {
    // The limit is 104857600 bytes and the contract calls it 100 MB. If this
    // said "104.9 MB" the page would contradict the sentence beside it.
    expect(formatBytes(104_857_600)).toBe("100 MB");
    expect(formatBytes(104_857_601)).toBe("100 MB");
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(1024 * 1024)).toBe("1 MB");
    expect(formatBytes(1_048_576 * 10)).toBe("10 MB");
  });

  it("drops the decimal on a round number and keeps it when it means something", () => {
    expect(formatBytes(1_500_000)).toBe("1.4 MB");
    expect(formatBytes(128 * 1024)).toBe("128 KB");
  });

  it("refuses to print a number for a value that is not one", () => {
    expect(formatBytes(Number.NaN)).toBe("—");
    expect(formatBytes(-1)).toBe("—");
  });
});

describe("formatDuration", () => {
  it("shows tenths while a conversion is running", () => {
    // A running timer that does not visibly move looks like a hung page.
    expect(formatDuration(0)).toBe("0.0 s");
    expect(formatDuration(1234)).toBe("1.2 s");
    expect(formatDuration(59_999)).toBe("60.0 s");
  });

  it("drops to whole seconds once seconds stop being the interesting unit", () => {
    expect(formatDuration(60_000)).toBe("1 m 00 s");
    expect(formatDuration(72_400)).toBe("1 m 12 s");
    expect(formatDuration(3_600_000)).toBe("60 m 00 s");
  });

  it("does not print nonsense", () => {
    expect(formatDuration(Number.NaN)).toBe("—");
    expect(formatDuration(-5)).toBe("—");
  });
});

describe("formatCountdown", () => {
  it("rounds up, so it never shows zero while still waiting", () => {
    expect(formatCountdown(30_000)).toBe("30 s");
    expect(formatCountdown(29_500)).toBe("30 s");
    expect(formatCountdown(1)).toBe("1 s");
    expect(formatCountdown(0)).toBe("0 s");
    expect(formatCountdown(-100)).toBe("0 s");
  });
});

describe("extensionOf", () => {
  it("matches case-insensitively, because the file may not be lower-cased", () => {
    expect(extensionOf("Quarterly report.DOCX")).toBe(".docx");
    expect(extensionOf("report.docx")).toBe(".docx");
    expect(extensionOf("archive.tar.gz")).toBe(".gz");
  });

  it("returns nothing when there is no usable extension", () => {
    expect(extensionOf("README")).toBe("");
    expect(extensionOf(".hidden")).toBe("");
    expect(extensionOf("trailing.")).toBe(".");
    expect(extensionOf("")).toBe("");
  });
});

describe("stripExtension", () => {
  it("takes the last extension only", () => {
    expect(stripExtension("Quarterly report.docx")).toBe("Quarterly report");
    expect(stripExtension("archive.tar.gz")).toBe("archive.tar");
  });

  it("leaves a name that has no extension alone", () => {
    expect(stripExtension("README")).toBe("README");
    expect(stripExtension(".hidden")).toBe(".hidden");
  });
});
