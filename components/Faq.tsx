/**
 * The questions and answers, as `<details>` elements.
 *
 * Native disclosure, so this works with no JavaScript at all: a `<summary>` is
 * focusable, toggles on Enter and Space, and is announced as a disclosure
 * without any ARIA to maintain. The alternative — a button and a height
 * animation — needs JS for the toggle and still ends up reimplementing what
 * `<details>` already does correctly.
 *
 * The answers are also what `lib/schema.ts` puts in the page's `FAQPage`
 * structured data. Both read the same array, so a question cannot appear in the
 * markup a crawler reads without also being visible on the page, which is
 * exactly the mismatch that earns a structured-data penalty.
 */
import type { ConversionEntry } from "@/lib/catalog";

export function Faq({ faqs }: { faqs: ConversionEntry["faqs"] }): React.ReactElement {
  return (
    <div className="faq">
      {faqs.map((faq) => (
        <details className="faq-item" key={faq.question}>
          <summary className="faq-question">{faq.question}</summary>
          <p className="faq-answer">{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}
