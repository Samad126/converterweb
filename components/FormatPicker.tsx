"use client";

/**
 * The target chooser, built entirely from `GET /formats`.
 *
 * Three rules decide what this renders, and none of them involve a list in this
 * file:
 *
 *   1. Every target the server declares is offered, in the server's order.
 *   2. A target is enabled only when the chosen source lists it.
 *   3. A target that exists but is unreachable is shown, disabled, with a
 *      reason read out of the same response — which extensions *can* reach it.
 *
 * Disabled options are rendered rather than hidden because "you cannot have a
 * PNG" and "there is no PNG" are different facts, and only one of them is worth
 * saying. They are real `<input type="radio" disabled>` elements, so they are
 * skipped by the tab order and announced as unavailable rather than being a
 * styled button that lies about being clickable.
 */
import type { FormatsResponse, SourceFormat, TargetId } from "@/lib/contract";
import { NO_SOURCE_REASON, isReachable, unreachableReason } from "@/lib/formats";

import { CheckIcon } from "./Icons";

export interface FormatPickerProps {
  /** The radio group's name. Unique per picker instance. */
  name: string;
  formats: FormatsResponse;
  /** The source implied by the chosen file, or `null` before one is chosen. */
  source: SourceFormat | null;
  selected: TargetId | null;
  /** True while a conversion is running: everything goes inert. */
  inert: boolean;
  onSelect: (targetId: TargetId) => void;
}

export function FormatPicker({
  name,
  formats,
  source,
  selected,
  inert,
  onSelect,
}: FormatPickerProps): React.ReactElement {
  return (
    <fieldset className="picker-region">
      <legend className="sr-only">Output format</legend>

      <div className="picker">
        {formats.targets.map((target) => {
          const reachable = source !== null && isReachable(source, target.id);
          const isSelected = reachable && selected === target.id;

          // Read out of the matrix, never written down here: when the service
          // grows a source that can make this target, the sentence follows.
          const meta = !reachable
            ? source === null
              ? NO_SOURCE_REASON
              : unreachableReason(formats, target.id)
            : target.multiple
              ? `${target.extension} · ZIP`
              : target.extension;

          return (
            <label
              key={target.id}
              className="chip"
              data-selected={isSelected}
              data-disabled={!reachable}
            >
              <input
                type="radio"
                name={name}
                value={target.id}
                className="sr-only"
                checked={isSelected}
                disabled={!reachable || inert}
                onChange={() => onSelect(target.id)}
              />
              {/*
                The space between the two lines is load-bearing: without it the
                radio's accessible name runs the label into the extension and
                announces them as a single word.
              */}
              <span className="chip-title">{target.label}</span>{" "}
              <span className="chip-meta">{meta}</span>
              {isSelected ? <CheckIcon size={14} className="chip-check" /> : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
