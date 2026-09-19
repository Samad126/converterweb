/**
 * The tool grid, with its category filter.
 *
 * The filter is the interesting part. Every one of these cards is an internal
 * link the site is counting on, so the grid cannot be built by JavaScript that
 * renders a subset — the links have to be in the HTML. It also cannot re-render
 * on a click for the same reason, and because the page should work with the
 * script blocked or still loading.
 *
 * So the pills are real `<input type="radio">` elements — the same decision
 * `FormatPicker` makes, for the same reason: a radio group is natively
 * keyboard-navigable and natively announced, where a row of styled buttons has
 * to reimplement both — and the filtering itself is done in CSS by
 * `:has()`, which is already used elsewhere in `app/globals.css`.
 *
 * The consequence worth stating: all thirty-six links are always in the
 * document. The filter hides cards from a sighted visitor; it hides nothing from
 * a crawler, and nothing from a screen reader that has not chosen a category.
 *
 * "All" is the default and has no rule of its own — a card is shown until a
 * specific category is chosen, so the unfiltered case is the one that needs no
 * CSS at all.
 */
import { ToolCard } from "@/components/ToolCard";
import { FAMILY_LABELS, type ConversionEntry, type Family } from "@/lib/catalog";

export interface ToolGridProps {
  entries: readonly ConversionEntry[];
  /**
   * The radio group's name, and the prefix for its ids.
   *
   * The stylesheet's `:has()` rules match on these ids, so a second grid on the
   * same page needs its own and its own rules. One grid per page is the design.
   */
  name?: string;
}

export function ToolGrid({ entries, name = "family" }: ToolGridProps): React.ReactElement {
  const families = entries
    .map((entry) => entry.source.family)
    .filter((family, index, all) => all.indexOf(family) === index);

  return (
    <div className="tool-browser">
      <fieldset className="pill-set">
        <legend className="sr-only">Filter the tools by document type</legend>

        <input
          type="radio"
          name={name}
          id={`${name}-all`}
          defaultChecked
          className="sr-only"
        />
        <label className="pill" htmlFor={`${name}-all`}>
          All
        </label>

        {families.map((family) => (
          <FamilyPill key={family} family={family} name={name} />
        ))}
      </fieldset>

      <div className="tool-grid">
        {entries.map((entry) => (
          <ToolCard key={entry.slug} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function FamilyPill({ family, name }: { family: Family; name: string }): React.ReactElement {
  const id = `${name}-${family}`;
  return (
    <>
      <input type="radio" name={name} id={id} className="sr-only" />
      <label className="pill" htmlFor={id}>
        {FAMILY_LABELS[family]}
      </label>
    </>
  );
}
