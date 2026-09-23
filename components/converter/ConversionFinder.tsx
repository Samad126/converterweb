"use client";

/**
 * The `/conversions` page's picker: choose a source format, then one of the
 * targets it can actually reach, and land on that pair's page.
 *
 * Not to be confused with `FormatPicker` — that one is the target-format radio
 * grid inside the running converter (`StatusPanel`), built from a live
 * `GET /formats` response. This one has no network call and nothing to run;
 * it is editorial navigation over `lib/content/conversionIndex.ts`, which
 * joins the document catalog and the audio/video catalog into one list of
 * source -> targets groups, the same data the sections below it render. It
 * invents no capability: every target shown for a source is a page one of
 * those catalogs publishes, so there is nothing here for a person to pick
 * that doesn't lead to a real page.
 *
 * Searchable by name, extension or kind: "word", ".mp3", "audio" and "video"
 * all narrow the list, across documents and media alike.
 *
 * A widget, not the only path: every one of these pages is also linked from
 * the sections directly below, so nothing here has to work without JavaScript
 * for the site to stay fully crawlable.
 */
import Link from "next/link";
import { useMemo, useState } from "react";

import { FormatBadge } from "@/components/ui/FormatBadge";
import { FINDER_GROUPS, type FinderSource } from "@/lib/content/conversionIndex";

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

export function ConversionFinder(): React.ReactElement {
  const [query, setQuery] = useState("");
  const [sourceKey, setSourceKey] = useState<string | null>(null);

  const filteredGroups = useMemo(() => {
    const q = normalize(query);
    if (q === "") return FINDER_GROUPS;
    return FINDER_GROUPS.map((group) => {
      const groupMatches = normalize(group.label).includes(q);
      return {
        ...group,
        sources: group.sources.filter(
          (source) =>
            groupMatches ||
            normalize(source.label).includes(q) ||
            source.searchTerms.some((term) => term.includes(q)),
        ),
      };
    }).filter((group) => group.sources.length > 0);
  }, [query]);

  const selectedSource: FinderSource | null = useMemo(() => {
    for (const group of FINDER_GROUPS) {
      const found = group.sources.find((source) => source.key === sourceKey);
      if (found) return found;
    }
    return null;
  }, [sourceKey]);

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
          placeholder="Search a format — e.g. “word”, “mp3” or “video”"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        <div className="format-picker-columns">
          <nav className="format-picker-sources" aria-label="Source formats">
            {filteredGroups.map((group) => (
              <div key={group.key} className="format-picker-group">
                <span className="format-picker-group-heading">{group.label}</span>
                <ul className="format-picker-source-list">
                  {group.sources.map((source) => (
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
            ))}
            {filteredGroups.length === 0 ? (
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
                  {selectedSource.targets.map((target) => (
                    <Link key={target.href} href={target.href} className="format-picker-target">
                      <FormatBadge label={target.badge} filled />
                      {target.label}
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
