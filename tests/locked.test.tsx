/**
 * A conversion page: one format, one kind of input, no picker.
 *
 * The whole difference between `/word_to_pdf` and `/png_to_pdf` is these two
 * props, so the things worth testing are the two ways a page can be talked out
 * of its subject — a file that is not what the page is for, and a format the
 * person tries to change — plus the promise that the *rest* of the converter is
 * untouched by the narrowing.
 */
import { render, screen } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ConverterShell } from "@/components/ConverterShell";
import type { TargetId } from "@/lib/contract";

import { chooseFile, dropFile, fileInput } from "./helpers";

const WORD = [".docx", ".doc", ".docm"];

/** Render a page about one conversion, the way `/[conversion]` does. */
async function setupLocked(
  target: TargetId = "pdf",
  accepted: readonly string[] = WORD,
): Promise<UserEvent> {
  const user = userEvent.setup();
  render(<ConverterShell lockedTargetId={target} acceptedExtensions={accepted} />);
  await screen.findByRole("button", { name: /Convert/ });
  return user;
}

describe("a page that is about one conversion", () => {
  it("does not offer a format picker at all", async () => {
    await setupLocked();

    // The step is gone, not merely collapsed: no radio group, no heading, no
    // chips. This is the whole point of the change.
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.queryByText(/Choose an output format/i)).toBeNull();
  });

  it("numbers the steps as two, because there are two", async () => {
    await setupLocked();
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);

    expect(headings[0]).toMatch(/Choose a file/);
    expect(headings[0]).toMatch(/^1/);
    // Convert is 2, not 3 — a locked page never had a step 2 to skip past.
    expect(headings[1]).toMatch(/^2\s*Convert/);
    expect(headings).toHaveLength(2);
  });

  it("names its format on the button before a file is chosen", async () => {
    await setupLocked("pdf");

    // Useful on a page whose entire subject is this conversion, and safe: the
    // button is disabled until there is a file, so a preset cannot start a
    // conversion of nothing.
    expect(screen.getByRole("button", { name: "Convert to PDF" })).toBeDisabled();
  });

  it("offers only the extensions the page accepts in the file input", async () => {
    await setupLocked("pdf", WORD);

    // Media types ride along with the extensions — see `acceptAttribute` in
    // `lib/formats.ts` — so a mobile picker filtering by MIME doesn't hide
    // every file.
    expect(fileInput()).toHaveAttribute(
      "accept",
      [
        ".docx,.doc,.docm",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-word.document.macroEnabled.12",
        "application/msword",
      ].join(","),
    );
    expect(screen.getByText(/\.docx, \.doc, \.docm/)).toBeInTheDocument();
  });

  it("converts once a file of the right kind arrives", async () => {
    const user = await setupLocked("pdf");
    await chooseFile(user, "report.docx");

    expect(screen.getByRole("button", { name: "Convert to PDF" })).toBeEnabled();
  });
});

describe("a file the page is not for", () => {
  /*
   * Dropped, not chosen. The narrowed `accept` attribute means the file dialog
   * cannot offer a PNG on this page at all — the assertion above covers that —
   * so the only way a wrong file reaches the converter is a drag-and-drop, which
   * bypasses `accept` by design. That is the path worth testing, because it is
   * the one the extension check actually has to defend.
   */
  it("refuses it, and names this page's extensions rather than the service's", async () => {
    await setupLocked("pdf", WORD);
    dropFile("photo.png");

    const alert = await screen.findByRole("alert");
    // The service accepts PNG. This page does not, and the sentence has to be
    // about this page — otherwise it sends the reader looking for a CSV.
    expect(alert).toHaveTextContent("photo.png is a .png file");
    expect(alert).toHaveTextContent("Accepted: .docx, .doc, .docm.");
    expect(alert).not.toHaveTextContent(".csv");
    expect(alert).not.toHaveTextContent(".png,");
  });

  it("keeps the page's format after refusing a file", async () => {
    // The rejection paths used to clear the target, which on a locked page
    // would leave it with no subject at all.
    await setupLocked("pdf", WORD);
    dropFile("photo.png");

    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Convert to PDF" })).toBeDisabled();
  });

  it("still accepts the formats it does take after a refusal", async () => {
    const user = await setupLocked("pdf", WORD);
    dropFile("photo.png");
    await screen.findByRole("alert");

    await chooseFile(user, "report.docx");

    expect(screen.getByRole("button", { name: "Convert to PDF" })).toBeEnabled();
  });
});

describe("the universal tool, which locks nothing", () => {
  it("still offers every format and every extension", async () => {
    const user = userEvent.setup();
    render(<ConverterShell />);
    await screen.findByRole("button", { name: "Convert" });

    // Both halves of the narrowing default to the whole service.
    expect(screen.getAllByRole("radio").length).toBeGreaterThan(1);
    expect(screen.getByText(/Choose an output format/i)).toBeInTheDocument();
    expect(fileInput()).toHaveAttribute("accept", expect.stringContaining(".docx"));
    expect(fileInput()).toHaveAttribute("accept", expect.stringContaining(".png"));

    // A PNG is accepted here, where the Word page refused it — and the format
    // still has to be chosen by hand, because nothing is locked.
    await chooseFile(user, "photo.png");
    expect(screen.getByRole("button", { name: "Convert" })).toBeDisabled();

    await user.click(screen.getByRole("radio", { name: /^PDF\b/ }));
    expect(screen.getByRole("button", { name: "Convert to PDF" })).toBeEnabled();
  });
});
