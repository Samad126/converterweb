/**
 * One task-category section on `/` and `/pdf`.
 *
 * The visual system here is deliberately not the flat card grid the rest of
 * the site uses (`.tool-grid`/`.tool-card` on `/conversions`): five identical
 * grids back to back would read as one long undifferentiated page, and this
 * design has no hue available to break that up with. So instead:
 *
 *   - Each section is opened by a band-weight rule — the heaviest break the
 *     system has. The previous design alternated a tinted band instead; with
 *     rules this heavy available, a 4% background shift was doing nothing the
 *     rule does not do better, so the tone alternation is gone and `index` is
 *     now only the numeral.
 *   - That numeral renders as an inverted block rather than a grey figure, so
 *     the count reads as a mark rather than as decoration.
 *   - The first item in every category renders as a "spotlight" card — the
 *     full inversion (`--surface-strong`/`--on-surface-strong`), spanning two
 *     grid columns — so the category has a visual entry point instead of six
 *     equally-weighted tiles.
 *
 * All of that is CSS (`.category-section`, `.category-grid`,
 * `.tool-card[data-spotlight]` in `app/globals.css`); this component only
 * decides which item is first.
 */
import Link from "next/link";

import type { Category } from "@/lib/content/categories";

export interface CategorySectionProps {
  category: Category;
  /** 1-based position, for the numeral and the tone alternation. */
  index: number;
  /** Omit the "see all" link when the section is already on that page. */
  hideSeeAll?: boolean;
}

export function CategorySection({
  category,
  index,
  hideSeeAll = false,
}: CategorySectionProps): React.ReactElement {
  return (
    <section className="category-section" aria-labelledby={`category-${category.id}`}>
      <div className="shell">
        <div className="category-header">
          <span className="category-index" aria-hidden="true">
            {String(index).padStart(2, "0")}
          </span>
          <div>
            <h2 className="category-title" id={`category-${category.id}`}>
              {category.label}
            </h2>
          </div>
        </div>
        <p className="category-lede">{category.lede}</p>

        <div className="category-grid">
          {category.items.map((item, itemIndex) => (
            <Link
              key={item.id}
              href={item.route}
              className="tool-card"
              data-spotlight={itemIndex === 0 ? "true" : undefined}
              prefetch={false}
            >
              <span className="tool-card-title">{item.label}</span>
              <span className="tool-card-blurb">{item.blurb}</span>
            </Link>
          ))}
        </div>

        {!hideSeeAll && (
          <p className="mt-6">
            <Link href={category.seeAllHref} className="btn-quiet">
              {category.seeAllLabel} →
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
