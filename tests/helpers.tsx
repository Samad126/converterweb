/**
 * The three gestures every UI test makes, in one place.
 *
 * The app is one form with one job, so a test reads as: open it, choose a file,
 * choose a format, convert. Anything more specific than that belongs in the test
 * that needs it.
 *
 * Tests render `ConverterShell` rather than a page. The converter used to be
 * `app/page.tsx`; it is now a component the landing page, `/convert` and all
 * conversion pages share, so rendering the component under test is
 * both closer to the truth and immune to the next round of routing.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";

import { ConverterShell } from "@/components/converter/ConverterShell";

/** Render the converter and wait until the matrix has loaded and the form is live. */
export async function setupPage(): Promise<UserEvent> {
  const user = userEvent.setup();
  render(<ConverterShell />);

  // Waiting for the primary button is waiting for both the matrix and the
  // health probe: it is disabled until the service has said it is ready.
  await screen.findByRole("button", { name: "Convert" });
  return user;
}

/** Wait for the page to leave the loading skeleton, without asserting on it. */
export async function waitForForm(): Promise<void> {
  await screen.findByLabelText(/Choose a file, or drop one here/);
}

export function fileInput(): HTMLInputElement {
  return screen.getByLabelText(/Choose a file, or drop one here/) as HTMLInputElement;
}

/** Hand a file to the input, the way the file dialog does. */
export async function chooseFile(
  user: UserEvent,
  name: string,
  bytes = 64,
): Promise<File> {
  const file = new File([new Uint8Array(bytes)], name, {
    type: "application/octet-stream",
  });
  await user.upload(fileInput(), file);
  return file;
}

/**
 * Drop a file on the zone rather than choosing it through the dialog.
 *
 * This is the path the `accept` attribute does not protect: a drag-and-drop
 * hand-off goes straight to the handler, so the extension check in the app is
 * the only thing between a `.zip` and an upload.
 */
export function dropFile(name: string, bytes = 64): File {
  const file = new File([new Uint8Array(bytes)], name, {
    type: "application/octet-stream",
  });
  const zone = screen.getByText(/Choose a file, or drop one here/).closest("label");
  if (zone === null) throw new Error("The drop zone is not a label element.");

  fireEvent.dragEnter(zone, { dataTransfer: { files: [file], types: ["Files"] } });
  fireEvent.drop(zone, { dataTransfer: { files: [file], types: ["Files"] } });
  return file;
}

/** Hand several files to the input in one gesture, the way a multi-select dialog does. */
export async function chooseFiles(
  user: UserEvent,
  names: readonly string[],
  bytes = 64,
): Promise<File[]> {
  const files = names.map(
    (name) => new File([new Uint8Array(bytes)], name, { type: "application/octet-stream" }),
  );
  await user.upload(fileInput(), files);
  return files;
}

/** A file of exactly `size` bytes, for the limit tests. */
export async function chooseFileOfSize(
  user: UserEvent,
  name: string,
  size: number,
): Promise<void> {
  const file = new File([new Uint8Array(size)], name, {
    type: "application/octet-stream",
  });
  await user.upload(fileInput(), file);
}

/** Pick a format by the label the server gave it — "PDF", "TXT", "PNG". */
export async function chooseFormat(user: UserEvent, label: string): Promise<void> {
  const radio = screen.getByRole("radio", {
    name: new RegExp(`^${label}\\b`),
  });
  await user.click(radio);
}

/** The chip element for a format, for asserting on its state. */
export function formatChip(label: string): HTMLElement {
  const radio = screen.getByRole("radio", {
    name: new RegExp(`^${label}\\b`),
  });
  const label_ = radio.closest("label");
  if (label_ === null) throw new Error(`The ${label} chip is not a label.`);
  return label_;
}

export function formatRadio(label: string): HTMLInputElement {
  return screen.getByRole("radio", {
    name: new RegExp(`^${label}\\b`),
  }) as HTMLInputElement;
}

/** Press the primary action. */
export async function convertNow(user: UserEvent, label = "Convert"): Promise<void> {
  await user.click(screen.getByRole("button", { name: label }));
}

/** The whole flow, for the tests that are about what happens afterwards. */
export async function convertFile(
  user: UserEvent,
  fileName: string,
  formatLabel: string,
): Promise<void> {
  await chooseFile(user, fileName);
  await chooseFormat(user, formatLabel);
  await convertNow(user, `Convert to ${formatLabel}`);
}
