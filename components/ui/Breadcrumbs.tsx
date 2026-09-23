import Link from "next/link";

import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbList } from "@/lib/content/schema";

/**
 * The breadcrumb trail, shared by every conversion page and every `/pdf/*`
 * tool page.
 *
 * `aria-label` on the `<nav>` and a plain `<ol>`: the ordered list is what
 * makes a screen reader announce "3 of 3", which is the whole point of a
 * breadcrumb. A page that also emits `BreadcrumbList` structured data should
 * build it from the same `crumbs` array, so the trail a crawler reads is the
 * trail a person sees.
 */
export function Breadcrumbs({
  crumbs,
}: {
  crumbs: readonly (readonly [string, string])[];
}): React.ReactElement {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <JsonLd document={breadcrumbList(crumbs)} />
      <ol className="breadcrumbs">
        {crumbs.map(([name, path], index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={path}>
              {last ? (
                // The current page is not a link to itself — following it would
                // reload the page a visitor is already reading.
                <span aria-current="page">{name}</span>
              ) : (
                <Link href={path}>{name}</Link>
              )}
              {!last ? <span className="breadcrumb-sep">/</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
