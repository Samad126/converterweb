"use client";

/**
 * A real `<input type="file">`, visually hidden but focusable, plus a `<label>`
 * that looks like a drop target.
 *
 * All three ways in have to work and they all go through the input: clicking
 * the label opens the picker, dropping a file lands in `onDrop`, and a keyboard
 * user tabs to the input and presses Enter or Space. The input is never
 * `display: none` and never `tabindex="-1"` — either would remove it from the
 * tab order and take the keyboard path with it. The focus ring is drawn on the
 * surrounding box by `.dropzone:has(input:focus-visible)` so that a keyboard
 * user sees a target, not a 1 px clipped rectangle.
 */
import { useRef, useState, type DragEvent, type ChangeEvent } from "react";

import { FileIcon } from "./Icons";

export interface DropZoneProps {
  /** Ties the label to the input. Must be unique on the page. */
  id: string;
  /** The `accept` attribute, built from `GET /formats`. */
  accept: string;
  /** Extensions, for the line under the title. Also from `GET /formats`. */
  acceptedLabel: string;
  /** The largest file the converter takes, already formatted. */
  limitLabel: string;
  /** Inert while a conversion is running, or while the service is not ready. */
  disabled: boolean;
  onSelect: (file: File) => void;
}

export function DropZone({
  id,
  accept,
  acceptedLabel,
  limitLabel,
  disabled,
  onSelect,
}: DropZoneProps): React.ReactElement {
  const [isDragging, setIsDragging] = useState(false);
  const depth = useRef(0);

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    // Reset first, so that choosing the same file twice fires `change` twice.
    event.target.value = "";
    if (file) onSelect(file);
  };

  const handleDragEnter = (event: DragEvent<HTMLLabelElement>): void => {
    event.preventDefault();
    depth.current += 1;
    setIsDragging(true);
  };

  // dragenter/dragleave fire for every child the pointer crosses, so the count
  // has to unwind before the highlight comes off.
  const handleDragLeave = (event: DragEvent<HTMLLabelElement>): void => {
    event.preventDefault();
    depth.current -= 1;
    if (depth.current <= 0) {
      depth.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLLabelElement>): void => {
    // Without this the browser refuses the drop and navigates to the file.
    event.preventDefault();
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>): void => {
    event.preventDefault();
    depth.current = 0;
    setIsDragging(false);
    if (disabled) return;

    const file = event.dataTransfer.files?.[0];
    // A drop bypasses the input's `accept` filter, so the extension check in
    // the caller is the one that actually protects this path.
    if (file) onSelect(file);
  };

  return (
    <>
      <input
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled}
        onChange={handleChange}
      />

      <label
        htmlFor={id}
        className="dropzone"
        data-inert={disabled}
        data-dragging={isDragging}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <FileIcon size={28} />
        <span className="dropzone-title">
          Choose a file, or drop one here
        </span>
        <span className="meta">
          Up to {limitLabel} · {acceptedLabel}
        </span>
      </label>
    </>
  );
}
