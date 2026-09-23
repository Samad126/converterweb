"use client";

/**
 * Loads `GET /formats` once and turns it into a search index.
 *
 * Separate from `useToolSearch` (the keyboard/query state) so that the index —
 * one network read, cached for the component's lifetime — is not rebuilt on
 * every keystroke. `searchItems` itself never touches the network at all.
 */
import { useEffect, useState } from "react";

import { fetchFormats } from "../api/api";
import { buildSearchIndex } from "./buildIndex";
import type { SearchItem } from "./types";

export type SearchIndexState =
  | { status: "loading" }
  | { status: "ready"; items: readonly SearchItem[] }
  | { status: "error" };

export function useSearchIndex(): SearchIndexState {
  const [state, setState] = useState<SearchIndexState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    fetchFormats()
      .then((formats) => {
        if (cancelled) return;
        setState({ status: "ready", items: buildSearchIndex(formats) });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
