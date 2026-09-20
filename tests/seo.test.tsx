/**
 * The SEO surface: what a crawler receives.
 *
 * The point of these pages is to be found, so the things that make them findable
 * are asserted rather than assumed — one `<h1>`, a title and description that
 * are present and distinct, a canonical URL, the structured data the page
 * promises, and every conversion link present in the HTML *without* JavaScript.
 *
 * The pages are async server components, which render in a test as ordinary
 * functions returning JSX. Nothing here needs a server: `render(await Page(...))`
 * is the same tree Next would serialise, minus the flight-data wrapper.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ConversionPage, {
  generateMetadata,
  generateStaticParams,
} from "@/app/[conversion]/page";
import ConversionsPage from "@/app/conversions/page";
import HomePage from "@/app/page";
import { SiteFooter } from "@/components/SiteFooter";
import { CATALOG, SLUGS } from "@/lib/catalog";
import sitemap from "@/app/sitemap";

/** Render `/word_to_pdf` the way Next would, and give back the element tree. */
async function renderConversion(slug: string): Promise<HTMLElement> {
  const element = await ConversionPage({ params: Promise.resolve({ conversion: slug }) });
  return render(element).container;
}

function jsonLd(container: HTMLElement): Array<Record<string, unknown>> {
  return [
    ...container.ownerDocument.querySelectorAll('script[type="application/ld+json"]'),
  ]
    .map((script) => script.textContent ?? "")
    .filter((text) => text.trim() !== "")
    .map((text) => JSON.parse(text) as Record<string, unknown>);
}

describe("the conversion page", () => {
  it("has exactly one h1, and it names the conversion", async () => {
    const container = await renderConversion("word_to_pdf");
    const headings = container.querySelectorAll("h1");

    expect(headings).toHaveLength(1);
    expect(headings[0]?.textContent).toBe("Word to PDF");
  });

  it("serves its content without needing the client bundle", async () => {
    // The prose is the reason the page exists for a search engine. If any of it
    // were rendered on the client, it would be invisible to a crawler, so the
    // angle sentence and the accepted extensions are checked here.
    const container = await renderConversion("word_to_pdf");
    const text = container.textContent ?? "";

    expect(text).toContain("The commonest reason to be here");
    expect(text).toContain(".docx, .doc and .docm");
    expect(text).toContain("What to expect");
  });

  it("renders the questions it publishes as structured data", async () => {
    // Marking up a question the page does not show is a structured-data
    // violation, so the two are compared rather than trusted to agree.
    const container = await renderConversion("word_to_pdf");
    const faq = jsonLd(container).find((doc) => doc["@type"] === "FAQPage") as {
      mainEntity: Array<{ name: string }>;
    };

    const visible = [...container.querySelectorAll(".faq-question")].map(
      (element) => element.textContent,
    );
    expect(faq.mainEntity.map((question) => question.name)).toEqual(visible);
  });

  it("publishes the four documents a page like this should", async () => {
    const container = await renderConversion("word_to_pdf");
    const types = jsonLd(container).map((doc) => doc["@type"]);

    expect(types).toContain("BreadcrumbList");
    expect(types).toContain("WebApplication");
    expect(types).toContain("HowTo");
    expect(types).toContain("FAQPage");
  });

  it("keeps its breadcrumb trail consistent between markup and data", async () => {
    const container = await renderConversion("word_to_pdf");
    const crumbs = jsonLd(container).find((doc) => doc["@type"] === "BreadcrumbList") as {
      itemListElement: Array<{ name: string }>;
    };

    expect(crumbs.itemListElement.map((item) => item.name)).toEqual([
      "Home",
      "All conversions",
      "Word to PDF",
    ]);
    // The last crumb is the current page and must not be a link to itself.
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("Word to PDF");
  });

  it("links to its sibling conversions, so no page is a dead end", async () => {
    const container = await renderConversion("word_to_pdf");
    const hrefs = [...container.querySelectorAll("a")].map((a) => a.getAttribute("href"));

    // Other formats the same source can become.
    expect(hrefs).toContain("/word_to_epub");
    expect(hrefs).toContain("/word_to_odt");
    // And other sources that can reach the same target.
    expect(hrefs).toContain("/excel_to_pdf");
    expect(hrefs).toContain("/png_to_pdf");
  });
});

describe("the metadata", () => {
  it("gives every page a distinct title, description and canonical", async () => {
    const titles = new Set<string>();

    for (const entry of CATALOG) {
      const metadata = await generateMetadata({
        params: Promise.resolve({ conversion: entry.slug }),
      });

      expect(metadata.title).toBe(entry.title);
      expect(metadata.description).toBe(entry.description);
      expect(metadata.alternates?.canonical).toBe(`/${entry.slug}`);
      expect((metadata.description ?? "").length).toBeLessThanOrEqual(160);

      titles.add(String(metadata.title));
    }

    expect(titles.size).toBe(CATALOG.length);
  });

  it("returns nothing for a slug that is not a page", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ conversion: "pdf_to_word" }),
    });
    expect(metadata.title).toBeUndefined();
  });
});

describe("the routes", () => {
  it("prerenders one page per catalog entry and no more", () => {
    const params = generateStaticParams().map((entry) => entry.conversion);

    expect(params).toHaveLength(SLUGS.length);
    expect([...params].sort()).toEqual([...SLUGS].sort());
    // PDF is never an input, so it is never a page.
    expect(params).not.toContain("pdf_to_word");
  });

  it("links every conversion from the homepage", () => {
    // `HomePage` itself only links the tools grid; the full set of thirty-six
    // conversions is reached through `SiteFooter`, which every page renders
    // via the root layout — so the two together are what a crawler sees.
    const { container } = render(
      <>
        <HomePage />
        <SiteFooter />
      </>,
    );
    const hrefs = new Set(
      [...container.querySelectorAll("a")].map((a) => a.getAttribute("href")),
    );

    for (const slug of SLUGS) {
      expect(hrefs.has(`/${slug}`), `the homepage does not link /${slug}`).toBe(true);
    }
  });

  it("links every conversion from the index", () => {
    const { container } = render(<ConversionsPage />);
    const hrefs = new Set(
      [...container.querySelectorAll("a")].map((a) => a.getAttribute("href")),
    );

    for (const slug of SLUGS) {
      expect(hrefs.has(`/${slug}`), `the index does not link /${slug}`).toBe(true);
    }
  });

  it("has a sitemap entry for every page, and nothing that 404s", () => {
    const urls = sitemap().map((entry) => new URL(entry.url).pathname);

    expect(urls).toHaveLength(SLUGS.length + 2);
    for (const slug of SLUGS) {
      expect(urls).toContain(`/${slug}`);
    }
    expect(urls).toContain("/");
    expect(urls).toContain("/conversions");
    // The page that was removed when the landing page took over the root.
    expect(urls).not.toContain("/convert");
  });
});
