/**
 * Schema.org structured data, built as plain objects.
 *
 * Each builder returns a JSON-LD document and nothing else — no React, no
 * formatting, no `dangerouslySetInnerHTML`. `components/seo/JsonLd.tsx` does the
 * rendering, which keeps all of this testable as data: a test can parse what a
 * page emits and assert on it without a DOM.
 *
 * Everything here describes what the page actually is and does. There is no
 * `aggregateRating`, no review count and no `FAQPage` question the page does not
 * visibly answer — structured data that describes something other than the page
 * is a manual-action risk, and inventing a rating for a converter nobody has
 * rated is the commonest way sites earn one.
 */
import type { ConversionEntry } from "./catalog";
import { MAX_UPLOAD_BYTES } from "../constants";
import { formatBytes } from "../format";
import { SITE_NAME, absoluteUrl, siteOrigin } from "./site";

/** A JSON-LD document. Loosely typed on purpose: this is a wire format, not a model. */
export type JsonLdDocument = Record<string, unknown>;

/** A breadcrumb trail for a page, as `[name, path]` pairs. */
export type Crumb = readonly [name: string, path: string];

export function breadcrumbList(crumbs: readonly Crumb[]): JsonLdDocument {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map(([name, path], index) => ({
      "@type": "ListItem",
      position: index + 1,
      name,
      item: absoluteUrl(path),
    })),
  };
}

/**
 * The FAQ rich result.
 *
 * Google requires every question here to be visible on the page, which is why
 * this is only ever called with the same `faqs` array the page renders in
 * `components/ui/Faq.tsx`. The two cannot drift, because there is one array.
 */
export function faqPage(faqs: ConversionEntry["faqs"]): JsonLdDocument {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

/** The site itself, for the root layout. */
export function webSite(): JsonLdDocument {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    description:
      "Convert documents, spreadsheets, presentations and images into PDF and other formats, free and without an account.",
    inLanguage: "en",
  };
}

/** The conversion itself, as a free browser application. */
export function conversionApplication(entry: ConversionEntry): JsonLdDocument {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: `${entry.heading} Converter`,
    url: absoluteUrl(`/${entry.slug}`),
    description: entry.description,
    applicationCategory: "UtilitiesApplication",
    // True: the conversion happens on a remote service either way, and this
    // application is the browser page that drives it.
    operatingSystem: "Any",
    browserRequirements: "Requires a modern browser with JavaScript enabled.",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: siteOrigin(),
    },
  };
}

/**
 * The three steps the page actually presents, in the order it presents them.
 *
 * They match the numbered sections the converter renders, so a rich result that
 * promises "three steps" is describing the same three steps a visitor sees.
 */
export function howTo(entry: ConversionEntry): JsonLdDocument {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `How to convert ${entry.sourceLabel} to ${entry.targetLabel}`,
    totalTime: "PT1M",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Choose your file",
        text: `Drag a ${entry.sourceLabel} file onto the page or pick one with the file dialog. ${entry.source.extensions.join(", ")} up to ${formatBytes(MAX_UPLOAD_BYTES)}.`,
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: `Convert to ${entry.targetLabel}`,
        text: `This page converts to ${entry.targetLabel} only, so there is no format to choose — press the convert button to upload the file and convert it.`,
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Download the result",
        text: `The ${entry.targetLabel} comes straight back and is downloaded to your device.`,
      },
    ],
  };
}

/** A list of the conversion pages, for the index and the homepage. */
export function itemList(entries: readonly ConversionEntry[]): JsonLdDocument {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "File conversion tools",
    numberOfItems: entries.length,
    itemListElement: entries.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.heading,
      url: absoluteUrl(`/${entry.slug}`),
    })),
  };
}

/** A list of pages by name and path, for the hubs that are not conversion catalogs. */
export function pageList(name: string, pages: readonly Crumb[]): JsonLdDocument {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: pages.length,
    itemListElement: pages.map(([label, path], index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: label,
      url: absoluteUrl(path),
    })),
  };
}
