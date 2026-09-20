"use client";

/**
 * The header's mobile-only controls: below the breakpoint where `.site-nav`
 * and the inline search box both disappear, this replaces them with two
 * icons — search and menu — each opening a full-width panel under the header
 * rather than competing with the wordmark for a header bar too narrow to
 * hold a search box and a link list at once.
 *
 * Only one panel is open at a time (`panel` is a single value, not two
 * booleans), and both share the same dismissal rules as `ToolsMenu`: a click
 * outside closes it, `Escape` closes it and returns focus to the icon that
 * opened it.
 */
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";

import { CloseIcon, MenuIcon, SearchIcon } from "@/components/Icons";
import { ToolSearch } from "@/components/ToolSearch";
import { CATEGORIES } from "@/lib/categories";
import { POPULAR } from "@/lib/catalog";

type Panel = "search" | "menu" | null;

/** Per group, so one long category doesn't make the panel an endless scroll. */
const MAX_ITEMS_PER_GROUP = 6;

export function MobileHeaderControls(): React.ReactElement {
  const [panel, setPanel] = useState<Panel>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!panel) return;

    function onPointerDown(event: MouseEvent): void {
      if (!containerRef.current?.contains(event.target as Node)) setPanel(null);
    }

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key !== "Escape") return;
      setPanel(null);
      (panel === "search" ? searchButtonRef : menuButtonRef).current?.focus();
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [panel]);

  function toggle(next: Exclude<Panel, null>): void {
    setPanel((current) => (current === next ? null : next));
  }

  return (
    <div className="mobile-header-controls" ref={containerRef}>
      <button
        type="button"
        ref={searchButtonRef}
        className="mobile-header-icon-btn"
        aria-expanded={panel === "search"}
        aria-label={panel === "search" ? "Close search" : "Search"}
        onClick={() => toggle("search")}
      >
        {panel === "search" ? <CloseIcon size={20} /> : <SearchIcon size={20} />}
      </button>

      <button
        type="button"
        ref={menuButtonRef}
        className="mobile-header-icon-btn"
        aria-expanded={panel === "menu"}
        aria-label={panel === "menu" ? "Close menu" : "Menu"}
        onClick={() => toggle("menu")}
      >
        {panel === "menu" ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
      </button>

      {panel === "search" ? (
        <div className="mobile-header-panel mobile-header-panel-search">
          <Suspense fallback={<div className="tool-search-input" aria-hidden="true" />}>
            <ToolSearch placeholder="Search tools" syncUrlParam={false} autoFocus />
          </Suspense>
        </div>
      ) : null}

      {panel === "menu" ? (
        <nav className="mobile-header-panel mobile-header-panel-menu" aria-label="Site">
          <ul className="mobile-nav-list">
            {POPULAR.slice(0, 4).map((entry) => (
              <li key={entry.slug}>
                <Link href={`/${entry.slug}`} onClick={() => setPanel(null)}>
                  {entry.heading}
                </Link>
              </li>
            ))}
          </ul>

          {CATEGORIES.map((category) => (
            <div key={category.id} className="mobile-nav-group">
              <span className="mobile-nav-heading">{category.label}</span>
              <ul className="mobile-nav-list">
                {category.items.slice(0, MAX_ITEMS_PER_GROUP).map((item) => (
                  <li key={item.id}>
                    <Link href={item.route} prefetch={false} onClick={() => setPanel(null)}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={category.seeAllHref}
                className="mobile-nav-seeall"
                onClick={() => setPanel(null)}
              >
                {category.seeAllLabel} →
              </Link>
            </div>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
