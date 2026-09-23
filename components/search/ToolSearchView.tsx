/**
 * Presentational combobox — renders a `ToolSearchController`, nothing else.
 *
 * No routing import, no `"use client"` fetch, no knowledge of `/formats`.
 * That is what makes it directly testable and directly relocatable: Phase 2
 * can mount this anywhere and skin it however the redesign decides, as long
 * as it is handed a controller.
 */
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const { query, setQuery, results, open, activeIndex, setActiveIndex, onKeyDown, select, statusText } =
    controller;

  // `open` is purely query-derived, so it stays true after a click outside the
  // combobox unless something here closes it. This is that something: a click
  // anywhere but the input or the listbox dismisses the list, and typing or
  // refocusing the input brings it back.
  const [dismissed, setDismissed] = useState(false);

  // The catalog failing to load has nothing to do with the query, so `open`
  // (query-derived) never covers it — this tracks "has this input been
  // focused at least once", which is what lets the error surface the moment
  // someone reaches the box, the same way a normal empty-query focus would
  // show a hint, rather than only after they start typing into a search that
  // can never return anything.
  const [touched, setTouched] = useState(false);

  const showList = !dismissed && (errored ? touched : open);

  useEffect(() => {
    if (!showList) return;

    function onPointerDown(event: MouseEvent): void {
      if (!containerRef.current?.contains(event.target as Node)) {
        setDismissed(true);
      }
    }

    function onDocumentKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") setDismissed(true);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onDocumentKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onDocumentKeyDown);
    };
  }, [showList]);

  const activeId = activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  const liveText = errored
    ? "The tool catalog could not be loaded."
    : loading
      ? "Loading the tool catalog…"
      : statusText;

  return (
    <div className="tool-search" ref={containerRef}>
      <label htmlFor={inputId} className="sr-only">
        Search tools and conversions
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listboxId}
        aria-activedescendant={activeId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={placeholder}
        value={query}
        disabled={loading}
        onChange={(event) => {
          setDismissed(false);
          setQuery(event.target.value);
        }}
        onFocus={() => {
          setDismissed(false);
          setTouched(true);
        }}
        onKeyDown={onKeyDown}
        autoFocus={autoFocus}
        className="tool-search-input"
      />

      <p className="sr-only" role="status" aria-live="polite">
        {liveText}
      </p>

      {showList && (
        <ul id={listboxId} role="listbox" aria-label="Search results" className="tool-search-listbox">
          {errored ? (
            <li className="tool-search-empty">
              The tool catalog couldn&rsquo;t be loaded, so search isn&rsquo;t available right now.{" "}
              <Link href="/conversions">Browse every conversion</Link> or{" "}
              <Link href="/pdf">every PDF tool</Link> instead.
            </li>
          ) : results.length === 0 ? (
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
