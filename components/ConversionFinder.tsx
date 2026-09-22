"use client";

/**
 * The `/conversions` page's picker: choose a source format, then one of the
 * targets it can actually reach, and land on that pair's page.
 *
 * Not to be confused with `FormatPicker` — that one is the target-format radio
 * grid inside the running converter (`StatusPanel`), built from a live
 * `GET /formats` response. This one has no network call and nothing to run;
 * it is editorial navigation over `lib/catalog.ts`, the same data the family
 * sections below it render, just entered by format instead of by document
 * family. It invents no capability: every source is `SOURCES`, and every
 * target shown for a source is read from `CATALOG` — which of these two
 * things does this service *actually* pair — never a fixed table of formats
 * the way a universal-converter's mega picker usually is. Picking a source
 * simply never shows a target it cannot reach; there is nothing here for a
 * person to pick that doesn't lead to a real page.
 *
 * A widget, not the only path: every one of these thirty-six pages is also
 * linked from the family sections directly below, so nothing here has to
 * work without JavaScript for the site to stay fully crawlable.
 */
import Link from "next/link";
import { useMemo, useState } from "react";

import { FormatBadge } from "@/components/FormatBadge";
import { CATALOG, FAMILY_LABELS, SOURCES, TARGETS, type Family, type SourceGroup } from "@/lib/catalog";

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

export function ConversionFinder(): React.ReactElement {
  const [query, setQuery] = useState("");
  const [sourceKey, setSourceKey] = useState<string | null>(null);

  const families = useMemo(() => {
    // The markup group has no `family` (pandoc, not LibreOffice) and is
    // excluded from these pills the same way `entriesByFamily` excludes it.
    const seen: Family[] = [];
    for (const source of SOURCES) {
      if (source.family !== undefined && !seen.includes(source.family)) seen.push(source.family);
    }
    return seen;
  }, []);

  const filteredSources = useMemo(() => {
    const q = normalize(query);
    if (q === "") return SOURCES;
    return SOURCES.filter(
      (source) =>
        normalize(source.label).includes(q) ||
        source.extensions.some((extension) => normalize(extension).includes(q)),
    );
  }, [query]);

  const selectedSource: SourceGroup | null =
    SOURCES.find((source) => source.key === sourceKey) ?? null;

  const targets = useMemo(() => {
    if (!selectedSource) return [];
    return CATALOG.filter((entry) => entry.source.key === selectedSource.key);
  }, [selectedSource]);

  return (
    <div className="format-picker">
      <div className="format-picker-preview">
        <FormatBadge label={selectedSource ? selectedSource.badge : "?"} />
        <span className="format-picker-preview-label">
          {selectedSource ? selectedSource.label : "Choose a format"}
        </span>

        <span className="format-picker-preview-arrow" aria-hidden="true">
          →
        </span>

        <FormatBadge label="?" />
        <span className="format-picker-preview-label">
          {selectedSource ? "Pick a result below" : "Result"}
        </span>
      </div>

      <div className="format-picker-body">
        <label htmlFor="format-picker-search" className="sr-only">
          Search formats
        </label>
        <input
          id="format-picker-search"
          type="text"
          className="input format-picker-search"
          placeholder="Search a format — e.g. “word” or “powerpoint”"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        <div className="format-picker-columns">
          <nav className="format-picker-sources" aria-label="Source formats">
            {families.map((family) => {
              const inFamily = filteredSources.filter((source) => source.family === family);
              if (inFamily.length === 0) return null;
              return (
                <div key={family} className="format-picker-group">
                  <span className="format-picker-group-heading">{FAMILY_LABELS[family]}</span>
                  <ul className="format-picker-source-list">
                    {inFamily.map((source) => (
                      <li key={source.key}>
                        <button
                          type="button"
                          className="format-picker-source-btn"
                          data-active={source.key === sourceKey ? "true" : undefined}
                          onClick={() => setSourceKey(source.key)}
                        >
                          {source.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            {filteredSources.length === 0 ? (
              <p className="meta">Nothing matches &ldquo;{query.trim()}&rdquo;.</p>
            ) : null}
          </nav>

          <div className="format-picker-targets">
            {selectedSource ? (
              <>
                <span className="format-picker-group-heading">
                  {selectedSource.label} converts to
                </span>
                <div className="format-picker-target-grid">
                  {targets.map((entry) => (
                    <Link key={entry.slug} href={`/${entry.slug}`} className="format-picker-target">
                      <FormatBadge label={TARGETS[entry.target].badge} filled />
                      {TARGETS[entry.target].label}
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <p className="meta format-picker-hint">
                Pick a source format on the left to see what it can become.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
