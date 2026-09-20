/**
 * Presentational combobox — renders a `ToolSearchController`, nothing else.
 *
 * No routing import, no `"use client"` fetch, no knowledge of `/formats`.
 * That is what makes it directly testable and directly relocatable: Phase 2
 * can mount this anywhere and skin it however the redesign decides, as long
 * as it is handed a controller.
 */
import Link from "next/link";
import { useId, useRef } from "react";

import type { ToolSearchController } from "@/lib/search/useToolSearchController";

export interface ToolSearchViewProps {
  controller: ToolSearchController;
  placeholder?: string;
  loading?: boolean;
  errored?: boolean;
  autoFocus?: boolean;
}

export function ToolSearchView({
  controller,
  placeholder = "Search a format, extension or tool",
  loading = false,
  errored = false,
  autoFocus = false,
}: ToolSearchViewProps): React.ReactElement {
  const inputId = useId();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const { query, setQuery, results, open, activeIndex, setActiveIndex, onKeyDown, select, statusText } =
    controller;

  const activeId = activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  const liveText = errored
    ? "The tool catalog could not be loaded."
    : loading
      ? "Loading the tool catalog…"
      : statusText;

  return (
    <div className="tool-search">
      <label htmlFor={inputId} className="sr-only">
        Search tools and conversions
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={activeId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={placeholder}
        value={query}
        disabled={loading || errored}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={onKeyDown}
        autoFocus={autoFocus}
        className="tool-search-input"
      />

      <p className="sr-only" role="status" aria-live="polite">
        {liveText}
      </p>

      {open && (
        <ul id={listboxId} role="listbox" aria-label="Search results" className="tool-search-listbox">
          {results.length === 0 ? (
            <li className="tool-search-empty">
              Nothing matches &ldquo;{query.trim()}&rdquo;.{" "}
              <Link href="/conversions">See every conversion</Link> or{" "}
              <Link href="/pdf">every PDF tool</Link>.
            </li>
          ) : (
            results.map((result, i) => (
              <li
                key={result.item.id}
                id={`${listboxId}-option-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                data-active={i === activeIndex ? "true" : undefined}
                className="tool-search-option"
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={(event) => {
                  // mousedown, not click: fires before the input blurs.
                  event.preventDefault();
                  select(result);
                }}
              >
                {result.item.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
