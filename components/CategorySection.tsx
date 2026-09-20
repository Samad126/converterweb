/**
 * One task-category section on `/` and `/pdf` — a heading, a lede, its
 * featured items as cards, and a link to the exhaustive list.
 *
 * Server-rendered, like `ToolGrid`: every link is in the HTML, nothing here
 * waits on the client. Reuses the existing `.tool-card`/`.tool-grid` classes
 * rather than inventing a second card style for the same shape of link.
 */
import Link from "next/link";

import type { Category } from "@/lib/categories";

export interface CategorySectionProps {
  category: Category;
  /** Omit the "see all" link when the section is already on that page. */
  hideSeeAll?: boolean;
}

export function CategorySection({ category, hideSeeAll = false }: CategorySectionProps): React.ReactElement {
  return (
    <section className="shell section section-rule" aria-labelledby={`category-${category.id}`}>
      <h2 className="section-title" id={`category-${category.id}`}>
        {category.label}
      </h2>
      <p className="section-lede">{category.lede}</p>

      <div className="tool-grid mt-8">
        {category.items.map((item) => (
          <Link key={item.id} href={item.route} className="tool-card" prefetch={false}>
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
    </section>
  );
}
