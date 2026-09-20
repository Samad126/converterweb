/**
 * Two or more files in one request: the response is always a ZIP holding one
 * entry per input file, plus `errors.json` when any file failed — see
 * `components/responses/ConvertedToTarget`.
 *
 * `lib/api`'s `convert` is mocked here rather than driven through MSW. MSW
 * (like the rest of this test environment) reconstructs a request/response
 * body it is handed, and that reconstruction is not byte-exact for a real
 * compressed ZIP — the same limitation `tests/transport.test.ts` notes for an
 * *outgoing* multipart body. `fetchFormats` and `checkHealth` still go
 * through the real MSW handlers; only the one call whose binary response
 * this environment cannot carry faithfully is replaced. `lib/zip.ts`'s own
 * parsing of a real ZIP is exercised in full, without a mock, in
 * `tests/zip.test.ts`.
 */
import { screen, within } from "@testing-library/react";
import { zipSync } from "fflate";
import { describe, expect, it, vi } from "vitest";

import { MAX_CONVERT_FILES, MAX_CONVERT_TOTAL_BYTES } from "@/lib/constants";
import type { ConvertHandle, ConvertResult } from "@/lib/api";

import { chooseFiles, chooseFormat, convertNow, setupPage } from "./helpers";

const text = (value: string): Uint8Array => new TextEncoder().encode(value);
const zipBlob = (entries: Record<string, Uint8Array>): Blob =>
  new Blob([zipSync(entries) as unknown as BlobPart]);

/** A resolved `ConvertHandle`, as `lib/api`'s real `convert` returns one. */
function resolvedHandle(result: ConvertResult): ConvertHandle {
  return { promise: Promise.resolve(result), abort: () => {} };
}

let nextResult: ConvertResult | null = null;
let seenFiles: readonly File[] = [];

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    convert: (_target: string, files: readonly File[]) => {
      seenFiles = files;
      if (nextResult === null) throw new Error("bulk-conversion.test.tsx: set nextResult first");
      return resolvedHandle(nextResult);
    },
  };
});

describe("a bulk conversion (two or more files)", () => {
  it("offers the archive and every file's own outcome, all succeeding", async () => {
    nextResult = {
      blob: zipBlob({ "01-a.pdf": text("%PDF fake a"), "02-b.pdf": text("%PDF fake b") }),
      mediaType: "application/zip",
      disposition: 'attachment; filename="converted.zip"',
      requestId: "req-bulk-1",
    };

    const user = await setupPage();
    await chooseFiles(user, ["a.docx", "b.docx"]);
    await chooseFormat(user, "PDF");
    await convertNow(user, "Convert to PDF");

    const zipDownload = await screen.findByRole("link", { name: /Download all as ZIP/ });
    expect(zipDownload).toHaveAttribute("download", "converted.zip");

    const outcomes = screen.getByRole("list", { name: "Every file's outcome" });
    expect(within(outcomes).getByText("a.docx")).toBeInTheDocument();
    expect(within(outcomes).getByText("b.docx")).toBeInTheDocument();

    const perFileDownloads = within(outcomes).getAllByRole("link", { name: /Download/ });
    expect(perFileDownloads).toHaveLength(2);

    expect(seenFiles.map((f) => f.name)).toEqual(["a.docx", "b.docx"]);
  });

  it("attributes a per-file failure to the file it belongs to, from errors.json", async () => {
    nextResult = {
      blob: zipBlob({
        "01-a.pdf": text("%PDF fake a"),
        "errors.json": text(
          JSON.stringify([
            { file: "b.docx", code: "unprocessable", message: "b.docx is password protected." },
          ]),
        ),
      }),
      mediaType: "application/zip",
      disposition: 'attachment; filename="converted.zip"',
      requestId: null,
    };

    const user = await setupPage();
    await chooseFiles(user, ["a.docx", "b.docx"]);
    await chooseFormat(user, "PDF");
    await convertNow(user, "Convert to PDF");

    await screen.findByRole("link", { name: /Download all as ZIP/ });

    const outcomes = screen.getByRole("list", { name: "Every file's outcome" });
    const failedRow = within(outcomes).getByText("b.docx").closest("li");
    expect(failedRow).not.toBeNull();
    expect(
      within(failedRow as HTMLElement).getByText("b.docx is password protected."),
    ).toBeInTheDocument();

    const succeededRow = within(outcomes).getByText("a.docx").closest("li");
    expect(succeededRow).not.toBeNull();
    expect(
      within(succeededRow as HTMLElement).getByRole("link", { name: /Download/ }),
    ).toBeInTheDocument();

    // The overall archive is still offered, whatever the mix of outcomes.
    expect(screen.getByRole("link", { name: /Download all as ZIP/ })).toBeInTheDocument();
  });

  it("posts every chosen file under the same request, in order", async () => {
    nextResult = {
      blob: zipBlob({ "01-a.pdf": text("a"), "02-b.pdf": text("b"), "03-c.pdf": text("c") }),
      mediaType: "application/zip",
      disposition: null,
      requestId: null,
    };

    const user = await setupPage();
    await chooseFiles(user, ["a.docx", "b.docx", "c.docx"]);
    await chooseFormat(user, "PDF");
    await convertNow(user, "Convert to PDF");

    await screen.findByRole("link", { name: /Download all as ZIP/ });
    expect(seenFiles.map((f) => f.name)).toEqual(["a.docx", "b.docx", "c.docx"]);
  });
});

describe("the client-side file-count and size ceilings", () => {
  it("refuses a file that would push the selection past the file-count ceiling", async () => {
    const user = await setupPage();
    const names = Array.from({ length: MAX_CONVERT_FILES + 1 }, (_, i) => `f${i}.docx`);
    await chooseFiles(user, names);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(`at most ${MAX_CONVERT_FILES} files`);
  });

  it("refuses a file that would push the selection past the combined size ceiling", async () => {
    const user = await setupPage();
    // Five files at 25 MB each (each under the per-file limit on its own) sum
    // past the 100 MB combined ceiling.
    const bytesEach = 25_000_000;
    expect(bytesEach * 5).toBeGreaterThan(MAX_CONVERT_TOTAL_BYTES);
    await chooseFiles(user, ["a.docx", "b.docx", "c.docx", "d.docx", "e.docx"], bytesEach);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("may not exceed");
  });
});
