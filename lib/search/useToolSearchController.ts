"use client";

/**
 * The query/keyboard/selection state machine, with no dependency on routing.
 *
 * Split out from `components/ToolSearch.tsx` so it can be unit-tested (and
 * reused by Phase 2's eventual placement) without a Next.js router in scope —
 * `next/navigation` throws outside an actual app tree, and the interaction
 * logic here has nothing to do with *how* a selection is applied. Where a
 * selection goes is entirely the caller's `onSelect`.
 */
import { useMemo, useState } from "react";

import { searchItems } from "./rank";
import type { SearchItem, SearchResult } from "./types";

export interface ToolSearchController {
  query: string;
  setQuery: (value: string) => void;
  results: readonly SearchResult[];
  /** Whether the result list should be shown at all. */
  open: boolean;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  select: (result: SearchResult) => void;
  /** A sentence for a live region: result count, no-results, or "". */
  statusText: string;
}

export interface UseToolSearchControllerOptions {
  items: readonly SearchItem[] | null;
  initialQuery?: string;
  onSelect: (item: SearchItem) => void;
  onQueryChange?: (query: string) => void;
}

export function useToolSearchController({
  items,
  initialQuery = "",
  onSelect,
  onQueryChange,
}: UseToolSearchControllerOptions): ToolSearchController {
  const [query, setQueryState] = useState(initialQuery);
  const [rawActiveIndex, setActiveIndex] = useState(-1);

  function setQuery(value: string): void {
    setQueryState(value);
    onQueryChange?.(value);
  }

  const results = useMemo<readonly SearchResult[]>(() => {
    if (!items) return [];
    const trimmed = query.trim();
    if (trimmed === "") return [];
    return searchItems(items, trimmed);
  }, [items, query]);

  const open = items !== null && query.trim() !== "";

  // Derived, not effect-driven: never auto-selects a first option, and clamps
  // downward the moment the list shrinks under an already-active index, in
  // the same render rather than a render behind.
  const activeIndex = useMemo(() => {
    if (rawActiveIndex < 0 || results.length === 0) return -1;
    return Math.min(rawActiveIndex, results.length - 1);
  }, [rawActiveIndex, results.length]);

  function select(result: SearchResult): void {
    onSelect(result.item);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (!open || results.length === 0) {
      if (event.key === "Escape" && query !== "") {
        event.preventDefault();
        setQuery("");
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex(Math.min(activeIndex + 1, results.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex(Math.max(activeIndex - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(results.length - 1);
        break;
      case "Enter": {
        event.preventDefault();
        const chosen = results[activeIndex] ?? results[0];
        if (chosen) select(chosen);
        break;
      }
      case "Escape":
        event.preventDefault();
        setQuery("");
        setActiveIndex(-1);
        break;
      default:
        break;
    }
  }

  const statusText = !open
    ? ""
    : results.length === 0
      ? `No results for "${query.trim()}".`
      : `${results.length} result${results.length === 1 ? "" : "s"} for "${query.trim()}".`;

  return { query, setQuery, results, open, activeIndex, setActiveIndex, onKeyDown, select, statusText };
}
