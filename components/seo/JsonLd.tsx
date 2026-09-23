/**
 * One `<script type="application/ld+json">`, rendered from a builder in
 * `lib/content/schema.ts`.
 *
 * The escaping is the whole reason this file exists. `JSON.stringify` does not
 * escape `<`, so a string containing `</script>` would close the tag early and
 * spill the rest of the document into the page as markup. Nothing in the
 * catalog contains that today; the escape is here so that nothing has to
 * remember not to.
 */
import type { JsonLdDocument } from "@/lib/content/schema";

export function JsonLd({ document }: { document: JsonLdDocument }): React.ReactElement {
  const json = JSON.stringify(document)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
