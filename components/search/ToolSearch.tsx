"use client";

/**
 * The connected search surface: wires the live catalog and the router onto
 * `ToolSearchView`. This is the only file in the search feature that imports
 * `next/navigation` — everything else (`lib/search/*`, `ToolSearchView`) is
 * reusable without it, so Phase 2 relocating this only ever touches this file
 * and its CSS.
 *
 * URL: the query is mirrored to `?q=` with `router.replace` (no history entry
 * per keystroke, no scroll reset) whenever `syncUrlParam` is not `false`, so a
 * filtered view is linkable and survives back/forward. Off by default would
 * make search state disappear on refresh; on by default costs one query-string
 * write per keystroke, which is the cheaper trade for a page whose only other
 * query param, if any, is decided by the surface this is mounted on.
 */
import { useRouter, useSearchParams } from "next/navigation";

import { useSearchIndex } from "@/lib/search/useSearchIndex";
import { useToolSearchController } from "@/lib/search/useToolSearchController";

import { ToolSearchView } from "./ToolSearchView";

export interface ToolSearchProps {
  placeholder?: string;
  syncUrlParam?: string | false;
  autoFocus?: boolean;
  /** Called after a result is chosen, so a host panel can close itself. */
  onNavigate?: () => void;
}

export function ToolSearch({
  placeholder,
  syncUrlParam = "q",
  autoFocus = false,
  onNavigate,
}: ToolSearchProps): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const index = useSearchIndex();

  const initialQuery = syncUrlParam ? (searchParams.get(syncUrlParam) ?? "") : "";

  const controller = useToolSearchController({
    items: index.status === "ready" ? index.items : null,
    initialQuery,
    onSelect: (item) => {
      router.push(item.route);
      onNavigate?.();
    },
    onQueryChange: syncUrlParam
      ? (query) => {
          const params = new URLSearchParams(Array.from(searchParams.entries()));
          if (query) params.set(syncUrlParam, query);
          else params.delete(syncUrlParam);
          const next = params.toString();
          if (next === searchParams.toString()) return;
          router.replace(next ? `?${next}` : "?", { scroll: false });
        }
      : undefined,
  });

  return (
    <ToolSearchView
      controller={controller}
      placeholder={placeholder}
      loading={index.status === "loading"}
      errored={index.status === "error"}
      autoFocus={autoFocus}
    />
  );
}
