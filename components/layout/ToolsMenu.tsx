"use client";

/**
 * The header's "All tools" mega menu — a click-toggled panel grouped by
 * `lib/content/categories.ts`'s five job-based categories, so every tool on the site
 * is two clicks away from anywhere rather than only from the homepage grid
 * and the footer.
 *
 * A toggled panel rather than `:hover`, and for the same reason the header's
 * own doc comment used to rule dropdowns out entirely: hover has no keyboard
 * or touch equivalent, and a panel that only opens on hover is unreachable
 * without a mouse. This one opens on click, closes on `Escape` (returning
 * focus to the trigger), and closes on a click anywhere outside it — the same
 * pattern `ToolSearchView` uses for its results list.
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { CATEGORIES } from "@/lib/content/categories";

/** Per column, so one long category doesn't make the panel a scroll target. */
const MAX_ITEMS_PER_COLUMN = 8;

export function ToolsMenu(): React.ReactElement {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent): void {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      className="tools-menu"
      ref={containerRef}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        ref={buttonRef}
        className="tools-menu-trigger"
        aria-expanded={open}
        aria-controls="tools-panel"
        onClick={() => setOpen((value) => !value)}
      >
        All tools
        <span className="tools-menu-caret" data-open={open ? "true" : undefined} aria-hidden="true">
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      {open ? (
        <div id="tools-panel" className="tools-menu-panel">
          {CATEGORIES.map((category) => (
            <div key={category.id} className="tools-menu-column">
              <span className="tools-menu-heading">{category.label}</span>
              <ul className="tools-menu-list">
                {category.items.slice(0, MAX_ITEMS_PER_COLUMN).map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.route}
                      prefetch={false}
                      onClick={() => setOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={category.seeAllHref}
                className="tools-menu-seeall"
                onClick={() => setOpen(false)}
              >
                {category.seeAllLabel} →
              </Link>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
