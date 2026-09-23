# File converter — web client

Convert a document, spreadsheet, presentation, image, audio or video file into
another format, or run a PDF-only tool (merge, split, OCR, sign, redact and the
rest) directly on a PDF. Next.js (App Router) + TypeScript + Tailwind, tested
with Vitest, React Testing Library and MSW.

The site is organised into a handful of surfaces, each with its own hub and its
own family of dedicated, single-purpose pages:

| Surface | What it is |
| --- | --- |
| `/` | The landing page: what the service does, task categories, and links into every family below |
| `/{source}_to_{target}` | One page per document/spreadsheet/presentation/image conversion — 67 of them, e.g. `/word_to_pdf`, `/pdf_to_docx` |
| `/files/{source}_to_{target}` | The 602 remaining pairs the other catalogs don't cover — archives, images, data files, subtitles, e-books, fonts, 3D models, email and more document pairs, e.g. `/files/3mf_to_glb` (from `lib/files/fileCatalog.ts`) |
| `/conversions` | The full document-conversion index, grouped by family |
| `/audio`, `/audio/{source}_to_{target}` | The audio hub and its 210 conversion pages, e.g. `/audio/mp3_to_wav` |
| `/video`, `/video/{source}_to_{target}` | The video hub and its 156 conversion pages, e.g. `/video/mp4_to_webm` |
| `/pdf`, `/pdf/{tool}` | The PDF-tools hub and its 20 tool pages (merge, split, OCR, sign, redact, compare, and more) — these act on a PDF, they do not convert a format |
| `/tools`, `/tools/{tool}` | The two extraction tools that fit neither matrix: `extract-tables` (Word) and `psd-to-layers` (PSD) |
| `/about` | Who built it and how the two repositories (this client, and the conversion service) fit together |
| `/llms.txt` | A plain-text index for AI assistants and answer engines: the document conversions, the extra tools and the hub pages (it does not list the individual audio, video or `/files` pages) |

Every conversion page carries the converter itself, showing only that
conversion: the format is fixed, the file input accepts only the extensions that
page is for, and there is no format picker to distract from the one job. There is
no separate "convert anything" page either — `/convert`, which the single-page
version of this app served at `/`, is gone. The audio and video pages work the
same way but submit to async media jobs rather than a synchronous response; the
PDF tool pages don't pick a target at all, since the tool itself *is* the
operation.

The service is consumed by an already-shipped Android client, so its behaviour
is pinned. Nothing in here wraps, improves or re-interprets it: the client sends
what the contract says to send and shows what the contract says to show.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

```bash
npm run build        # production build
npm start            # serve the build
npm run test         # vitest, 290 tests
npm run lint         # eslint
npm run typecheck    # tsc --noEmit, strict
npm run gen:api      # regenerate lib/api/api-types.ts from openapi.json
```

Requires Node 20 or newer. There are no fonts, scripts or stylesheets fetched
from anywhere at runtime: the type is the system stack, so the page renders the
same on a machine that has never been online.

## Where the API base URL comes from

`NEXT_PUBLIC_CONVERTER_BASE_URL`, read once in `lib/api/api.ts`, **defaulting to
same-origin**. That default is the intended deployment: one reverse proxy in
front of both the page and the API, so there is no CORS and no preflight.

Set it only when the API lives somewhere else, and note what a cross-origin
deployment then owes this client:

- **CORS for the page's origin.** The request is preflighted — an XHR with an
  `upload` listener always is, and `upload` is how the progress bar works.
- **`Access-Control-Expose-Headers: X-Request-Id, Content-Disposition`.** A
  browser cannot read a response header CORS has not exposed, and these are the
  two headers the client is built on. Without them a download silently becomes
  `converted.<ext>` and an error loses the reference number users are told to
  quote.

See `.env.example`.

The browser talks to the API directly. There is no Next route handler in front
of it on purpose: a handler would add its own timeout to a budget that is
already 120 seconds, and it would hold a second copy of a 100 MiB upload in
memory while streaming it through.

As deployed, this **is** set — to `https://converterapi.alakbaroff.com`, in
`.env`. The page and the API are two hostnames, so every call is cross-origin,
and both bullets above are load-bearing rather than theoretical.

## Docker

```bash
cp .env.example .env    # then set NEXT_PUBLIC_CONVERTER_BASE_URL
docker compose up -d --build
```

Publishes on **`127.0.0.1:3011`** — loopback only, for the nginx block that
already fronts this hostname (`../backend/deploy/converter.alakbaroff.com.conf`,
which expects exactly this port). Nothing else can reach it, including your LAN.

The one thing to know before changing the URL: **`NEXT_PUBLIC_*` is inlined at
build time.** The value is a *build argument*, so it is baked into the image and
`docker compose up` alone will not pick up an edit — change `.env`, then
`--build`. A container started with a different value would go on serving the
old one, and since an empty base URL is a supported deployment, that mistake
does not announce itself. `docker-compose.yml` requires the variable rather than
defaulting it for the same reason.

The image is a standalone Next server (no npm, no source), runs as uid 1000 with
a read-only root filesystem and no capabilities, and carries its own
healthcheck. It needs no outbound network access: it serves a page, and the
browser makes the API calls.

### Deploying

Pushing to `master` runs `.github/workflows/deploy.yml`, which SSHes in, pulls
the checkout at `/pool/www/converter.alakbaroff.com/frontend`, and rebuilds the
`converterweb` service there. The build happens on the server, so the machine
that pushes does not need Docker.

Three repository secrets, which are **per repository** — the identically-named
ones on the API repo do not carry over:

```bash
gh secret set SSH_HOST     --repo Samad126/converterweb
gh secret set SSH_USER     --repo Samad126/converterweb
gh secret set SSH_PASSWORD --repo Samad126/converterweb
```

And one file that no clone can supply, because it is gitignored:

```bash
# On the server, once.
echo 'NEXT_PUBLIC_CONVERTER_BASE_URL=https://converterapi.alakbaroff.com' \
  > /pool/www/converter.alakbaroff.com/frontend/.env
```

This is a hard prerequisite, not a convenience. The value is inlined at build
time, so without the file the image is built with an empty base URL and the
bundle it serves points at the wrong host. What catches that is
`docker-compose.yml`'s `${NEXT_PUBLIC_CONVERTER_BASE_URL:?...}` — compose
refuses to build and names the variable, rather than quietly producing a page
that calls `converter.alakbaroff.com/formats` and reports the API as down.

`--build` is the other half. It is what re-runs `next build` with the current
value, so a deploy that skips it goes on serving the bundle it was built with.

## The API types cannot drift from the spec

`openapi.json` is the contract, and `lib/api/api-types.ts` is generated from it by
`openapi-typescript`:

```bash
npm run gen:api
```

The output is committed and never edited by hand — `lib/api/contract.ts` is the only
file that reaches into its shape, so a regeneration that renames something
breaks at compile time in one place rather than in twenty call sites.

## Where the conversion pages come from

`lib/content/catalog.ts` is the editorial layer: it decides **which pages exist and what
they say**. It does not decide **what can be converted** — that is still answered
on every page, at runtime, by `GET /formats`, through `findSource` / `isReachable`
/ `unreachableReason` exactly as before.

The split exists because a page that has to rank in a search engine has to carry
its prose and its internal links in the server-rendered HTML, which rules out
asking the service what it supports. So there is a curated table, and the rule
that used to forbid one — see `lib/converter/formats.ts` and `tests/content/matrix.test.tsx` — had
to be reconciled with it rather than quietly broken:

| Concern | Source of truth |
| --- | --- |
| Which pages exist, and what they say | `lib/content/catalog.ts` |
| Whether a conversion is possible at all | `GET /formats`, at runtime |
| Which targets a chosen file can reach | `isReachable`, at runtime |

Three things keep the catalog honest, and none of them is a promise:

1. **Types.** Each entry's `target` is a `TargetId` generated from `openapi.json`
   into `lib/api/contract.ts`, so naming a target the contract does not define is a
   compile error.
2. **A page cannot lie, even when it is wrong.** A conversion page locks its
   format and narrows its input, and neither can make it claim a conversion the
   service does not have: `canConvert` requires the live matrix to confirm the
   target is reachable, so a stale page shows the server's own reason and a
   button that refuses to run. See `components/converter/ConverterShell.tsx`.
3. **A test.** `tests/content/catalog.test.tsx` checks every extension and every pair
   against the matrix fixture, in both directions — so a page for a conversion
   the service cannot perform fails, and so does a conversion the service supports
   with no page.

`tests/content/matrix.test.tsx` still bans extension literals everywhere in `app/`,
`components/` and `lib/` **except `lib/content/catalog.ts`**, which is named and justified
inline there. The ban is a proxy for the rule above; the catalog test checks the
rule directly, which is why the exemption is not a hole. If you are adding a page
that needs to name a format, put it in the catalog rather than widening that
exemption.

`lib/content/catalog.ts` also exports `EXTRA_TOOLS` — the two standalone extraction
tools at `/tools/extract-tables` and `/tools/psd-to-layers`, which take a
source format (Word, PSD) the rest of the site never converts as a whole file
and reach exactly one target each, so they don't fit `{source}_to_{target}`.
Audio and video are the same idea at a different scale: `lib/media/mediaFormats.ts`
and `lib/media/mediaCatalog.ts` mirror `lib/content/catalog.ts`'s shape (source formats,
target notes, a generated catalog of pairs) but for the async media pipeline,
under `/audio` and `/video` rather than the root. PDF-only tools — operations
on a PDF that are not a conversion at all — live in `lib/pdf/pdfTools.ts` and are
grouped for the homepage and `/pdf` by `lib/content/categories.ts`, which also
partitions every `PDF_TOOLS` entry into a category and is checked exhaustive by
`tests/content/categories.test.ts`.

### A page is about one conversion

`/word_to_pdf` shows the word-to-PDF conversion and nothing else. Two props on
`ConverterShell` do that, and both narrow rather than merely default:

| Prop | Effect |
| --- | --- |
| `lockedTargetId` | Fixes the output. The format picker is not rendered, and the three steps become two |
| `acceptedExtensions` | Narrows the file input. `/word_to_pdf` takes the three Word extensions; a PNG is refused with a sentence about *this* page |

The second one matters more than it looks. Without it a PNG dropped on the Word
page converts happily, because the *service* accepts PNGs — true, but not what
the page said it would do, and the page is the thing that was indexed.

Three details worth knowing:

- **The picker is gone, not disabled.** A control with one option in it is noise;
  the format is already stated in the heading, the badge pair and the copy. A
  visitor who wanted a different format is served better by the sibling links
  than by a picker that would silently turn this page into a different one.
- **The narrow `accept` also filters the file dialog**, so the rejection path is
  only reachable by drag-and-drop, which bypasses `accept` by design. That is why
  `tests/converter/locked.test.tsx` drops the wrong file rather than choosing it —
  `userEvent.upload` honours `accept`, so choosing one could not reproduce the
  case at all.
- **A 415 offers a different file, not a different format.** On a page with one
  format, "choose another format" would be a button that does nothing, so
  `StatusPanel` maps that recovery to the only action left.

Leaving both props off gives back the universal tool, which is how the converter
tests still drive the four states end to end — but note that **no page uses it
any more**. If you are looking for somewhere to delete, that unlocked branch and
`components/converter/FormatPicker.tsx` are the candidates; they are kept because
`tests/content/matrix.test.tsx` treats the picker as the guard on the "no hard-coded
matrix" rule, and because a "convert anything" page would need them back.

### Slugs

`{source}_to_{target}`, both from the service's own vocabulary: `/word_to_pdf`,
`/png_to_pdf`, `/csv_to_xlsx`. The slug is derived from the pair rather than
stored, so the two cannot disagree.

`app/[conversion]/page.tsx` is a root-level dynamic segment, which means it also
matches every *other* single-segment path — `/favicon.ico` reaches it with
`conversion = "favicon.ico"`. Static routes win over dynamic ones, so `/`,
`/conversions`, `/robots.txt`, `/sitemap.xml` and `/icon.svg` all resolve to
their own files; everything else falls through. `dynamicParams = false` then
makes a miss a static 404 rather than a page rendered into `notFound()`, which is
the right semantic — the set of pages is closed — but it has one visible
consequence worth knowing about when reading server logs:

```
Error: Internal: NoFallbackError
```

That is Next's **control flow, not a failure** — it is how the server says "not
one of my prerendered paths, fall through to the 404". It appears in the log and
the response is still a correct 404. It shows up most often for `/favicon.ico`,
because browsers request that path whether or not the page declares an icon; the
`app/icon.svg` above is what stops them asking, and after it there is no such
line for a normal browser. A stray request from an old client that ignores the
`<link rel="icon">` tag will still log one, harmlessly — there is deliberately no
guessed-at binary `favicon.ico` to silence it.

Source groups fold together extensions the service already treats identically —
`.docx`, `.doc` and `.docm` are all `word`, because they share a Writer import
filter and reach the same targets. `tests/content/catalog.test.tsx` asserts that
grouping is lossless; if the service ever gave two extensions in a group
different targets, the test would fail rather than a page quietly overpromising.

Two consequences worth knowing:

- **Grouping means the page count is smaller than the raw extension count.**
  `lib/content/catalog.ts` currently has 67 entries in `CATALOG`, from 18 source groups
  (`SOURCES.length`) — fewer pages than one per raw extension because, as above,
  extensions that share an import filter and reach the same targets share a page.
- **PDF used to never be an input; it now is, for a fixed set of targets.** An
  earlier version of the service had no `.pdf` entry in `SOURCES` at all, and
  `app/not-found.tsx` still leads with that as the likely reason someone landed
  there. The service now extracts a PDF's own content back out — `pdf_to_docx`,
  `pdf_to_pptx`, `pdf_to_xlsx`, `pdf_to_markdown`, `pdf_to_png`, `pdf_to_jpg` and
  `pdf_to_pdfa` all exist — through a separate export engine, noted in
  `lib/content/catalog.ts`. What is still true: PDF never converts to itself, and a
  PDF's own pages (`word_to_pdf` and so on) still only ever *produce* PDF, never
  accept one.

## What the code is built on

| Rule | Where it lives |
| --- | --- |
| `POST /convert/{target}`; no bare `/convert` | `lib/api/api.ts` |
| A `200` must carry the target's own media type, charset ignored | `lib/converter/formats.ts` (`expectedMediaType`), checked in `lib/converter/useConverter.ts` |
| A non-2xx carries the JSON envelope; `error.message` shown verbatim | `lib/api/errors.ts` (`readErrorMessage`, `failureFromResponse`) |
| A body that is missing or not JSON falls back to `HTTP <status>` | `lib/api/errors.ts` (`fallbackMessage`) |
| `error.code` is never displayed | `ErrorNote` is never given it; asserted in `tests/converter/failures.test.tsx` |
| The matrix comes from `GET /formats` at runtime | `lib/converter/formats.ts`, and the whole of `tests/content/matrix.test.tsx` |
| Which conversion pages exist is editorial; what converts is not | `lib/content/catalog.ts` (pages), `GET /formats` (capability) |
| A page locks its format and narrows its input; it never offers a picker | `components/converter/ConverterShell.tsx`, `app/[conversion]/page.tsx` |
| A page cannot claim a conversion the live matrix does not confirm | `canConvert` in `lib/converter/useConverter.ts`, `tests/converter/locked.test.tsx` |
| The grid is server-rendered links; the filter is CSS `:has()` only | `components/ui/ToolGrid.tsx`, `app/globals.css` |
| Internal navigation is `next/link`; the catalog's bulk links opt out of prefetch | `components/ui/ToolCard.tsx`, `components/layout/SiteFooter.tsx` |
| Every conversion page has one `<h1>` and its own canonical | `app/[conversion]/page.tsx`, `tests/content/seo.test.tsx` |
| Structured data only describes what the page visibly shows | `lib/content/schema.ts`, compared in `tests/content/seo.test.tsx` |
| PDF is an output, never an input — no page says otherwise | asserted in `tests/content/catalog.test.tsx` |
| Image targets are archives, decided by `multiple` | `lib/constants.ts`, `lib/converter/formats.ts` (`downloadExtension`) |
| Both RFC 6266 filename forms, `filename*` preferred | `lib/api/contentDisposition.ts` |
| Exactly one `file` part, as `application/octet-stream` | `lib/api/api.ts`, asserted byte-for-byte in `tests/api/transport.test.ts` |
| 104857600 bytes (100 MiB), checked before the request | `lib/constants.ts` (`MAX_UPLOAD_BYTES`), `lib/converter/useConverter.ts` (`selectFile`) |
| The client gives up at 120 s, after the server's 90 s | `lib/constants.ts` (`CLIENT_ABORT_MS`) |
| `X-Request-Id` shown under an error with a copy button | `components/ui/ErrorNote.tsx` |
| Unauthenticated; no keys, tokens or login | nowhere, deliberately |

## Decisions where the contract left room

**Archive naming.** A `200` for `png` or `jpg` is `application/zip`, and the
download extension comes from the target's `multiple` flag — never from the
`Content-Disposition` header. The contract's own prose pins this (a multiple
target "always answers with an application/zip"), and the running service
happens to send `deck.zip` in the header anyway; the rule means the client is
right either way. Similarly, the media type accepted for a multiple target is
`application/zip` rather than the target's declared `image/png`, because that is
what the contract says arrives. The UI says *"A ZIP archive containing one image
per page"* on the chip, beside the format, and again on the result — a `.png`
that is really a ZIP is a surprise worth spending a sentence on.

**The 429 cooldown.** The response says "try again in a moment" and does not say
how long a moment is, so the 30 second cooldown is ours — a constant in
`lib/constants.ts`, with the countdown visible on the disabled button. It is not
a claim about the rate limiter; it is how long this client declines to ask
again. Nothing else retries on its own: a retry is always a button somebody
pressed.

**Which failures bring the form back.** A failed conversion leaves the file and
the format valid, and the only useful action is another attempt — so the page
shows the error and a **Try again**, and nothing else. Four failures mean the
*choice* was wrong instead, and there the form has to come back:

- `404` — the target does not exist at all. Our copy of the matrix is stale, so
  the matrix is re-fetched and the state offers **Start over**.
- `415` — a real target this source cannot reach. Same re-fetch, but the file
  was never the problem, so **Choose another format** keeps it.
- `422` — password protected. Retrying the same file can only fail again, so
  **Choose a different file**, which clears the selection and moves focus to the
  input.
- A client-side refusal (wrong extension, over 100 MiB) never reached the server,
  so it takes the same route: **Choose a different file**, and no request is
  made.

**Two sentences are ours, and only two.** The contract fixes the wording of the
120 second abort and the unreachable server; everything else the user reads under
an error is the server's own sentence, untouched. Added to those: *"The
conversion was cancelled."* for a Cancel the person pressed themselves (the
contract names the timeout case and not this one), and *"The converter sent a
reply this app could not read."* for a `200` that is not JSON — where `HTTP 200`
would be a true statement that tells the reader nothing.

**Disabled formats get a reason, from the matrix.** Every target the server
declares is shown, in the server's order. One this source cannot reach is
disabled and explains itself with the extensions that *can* reach it, read out
of the same response (`Only from .ods, .xlsx and .csv.`) — so the sentence and
the disabled state cannot drift apart when the service grows.

**`converted.<ext>`.** Used when the header is absent or has nothing usable in
it. A name like `.pdf` — a dotfile with no stem — is read as a name rather than
an extension and produces `pdf.pdf`; this is unreachable in practice, because a
file actually called `.pdf` has no extension for the matrix to match and is
refused before upload.

**Loading the matrix.** The skeleton reserves the picker's minimum height, so
learning the matrix does not shove the primary button down the page. It is a
reservation and not an exact prediction — the real height depends on how many
targets the server declares — and the picker is in the same element either way.

## Visual design: Monochrome & Slate

The strict black-and-white rule this app started with has been lifted. What
replaced it, `app/globals.css` calls Monochrome & Slate: deep blacks, crisp
whites and neutral greys, with exactly **one** saturated colour held back for
the things a visitor is meant to press — the convert button, the selected
target, the active filter, the conversion progress, the focus ring, and
nothing else. A charcoal slate is the secondary accent (format badges,
secondary marks); status keeps its own small chromatic set (warning, danger)
because "something went wrong" has to read as itself rather than as more grey.
Every other distinction in the app is still carried by weight, size and rule
rather than by hue — that discipline is what survived from the original rule,
not the achromatic constraint itself.

The whole Tailwind colour namespace is still cleared in `app/globals.css`
(`@theme { --color-*: initial }`), so `bg-red-500` is not a class that exists
and every colour has to resolve through the tokens in `:root`. What changed is
what's allowed to be *in* those tokens.

`tests/content/palette.test.ts` replaced `tests/achromatic.test.ts` for exactly that
reason: the old test failed on any hue at all, and that rule is no longer true.
The new one compiles the stylesheet through the real Tailwind pipeline and
fails if any colour it finds is outside an explicit, named palette — enforcing
"nothing added without a commit that says why" rather than "no colour, ever".

Meaning comes from type size and weight, the weight of a rule (2 px border, 4 px
division, 6 px band break), whitespace, and inversion — a filled block for the
result, the accent for the primary action. Errors are a left rule with a bold
**Error** label; success reuses the accent colour on purpose, so a completed
conversion is the same colour as the button that started it and green never
appears. Dark mode is not a straight inversion any more — it has its own rows
in the palette — but it follows the same four devices under
`prefers-color-scheme`.

### The landing page, and the icons it could not have

The landing page is modelled on iLovePDF's: a hero, a row of category pills, and
a grid of tool cards. That reference marks each tool with a coloured app icon —
a red W for Word, a green X for Excel — which is precisely the affordance this
design has no colours to spend on.

The replacement is inversion. `components/ui/FormatBadge.tsx` draws a monogram tile
per format and pairs them: **outline for the source, solid black for the target**,
joined by an arrow. `W → PDF` says which way the conversion goes in a way that a
grid of thirty-six cards otherwise makes genuinely hard to see, and it reuses the
one emphasis device the rest of the app already has.

Two other decisions on that page are worth knowing:

- **Every internal link is `next/link`, so navigation is client-side.** A plain
  `<a href>` — which this app used at first — is a full document load on every
  click: the browser re-downloads the page, re-parses it and re-hydrates React.
  That is exactly what a browser-rendered site feels like, and it is not what a
  Next app should feel like.
- **The two bulk link sets opt out of prefetching.** `ToolCard` and
  `SiteFooter` carry thirty-six links each, so `prefetch={false}` keeps them from
  preloading dozens of pages nobody will open. Everything else — the header,
  breadcrumbs, related conversions — keeps Next's default, where the preload is
  cheap and makes the click instant. Client-side routing and speculative
  preloading are separate concerns with separate switches; turning off the second
  is not a reason to give up the first.

- **The category filter is CSS, not JavaScript.** Every card is an internal link
  the site is counting on, so hiding cards by re-rendering would take those links
  out of the HTML. Instead the pills are real `<input type="radio">` elements —
  the same choice `FormatPicker` makes — and `:has()` does the filtering. All
  thirty-six links are always in the document.
- **The display type is the only fluid step in the scale.** `--text-3xl` is a
  `clamp()`; every other size is fixed. A headline that fills a phone's width
  overruns a desktop's measure, and one token with a `clamp()` solves it without
  a breakpoint ladder.

## Accessibility

- `role="alert"` for failures, `aria-live="polite"` for status; the running
  percentage and timer are `aria-hidden` so a screen reader hears "Uploading"
  once instead of a hundred times a second.
- The file input is a real, focusable `<input type="file">` — never
  `display:none`, never removed from the tab order — with its focus ring drawn
  on the surrounding box, so clicking, dragging and the keyboard all work.
- Format chips are real `<input type="radio">` elements, so a disabled one is
  skipped by the tab order and announced as unavailable rather than being a
  styled button that lies about being clickable.
- Focus is never removed: a 2 px outline with offset, on every interactive
  element, inverted on the black result block.
- Contrast is at least 4.5:1 in both themes; the lowest-contrast text token is
  `#737373` (4.7:1 on white, 4.9:1 on black).
- Motion is 120–200 ms ease-out only, and `prefers-reduced-motion: reduce` drops
  it to nothing while every state keeps saying what it means in words.

## Tests

```
tests/api/contentDisposition.test.ts        the two RFC 6266 forms, decoding, sanitising
tests/api/errors.test.ts                    the envelope, our sentences, status → recovery
tests/api/transport.test.ts                 the real multipart bytes, abort, the 120 s deadline
tests/api/transport/                        fixtures for the above (a real server on an ephemeral port)
tests/content/catalog.test.tsx              the catalog against the matrix, both directions
tests/content/categories.test.ts            every PDF_TOOLS id lands in exactly one homepage category
tests/content/matrix.test.tsx               the picker follows /formats; no hard-coded matrix
tests/content/palette.test.ts               the achromatic token set stays achromatic under theming
tests/content/seo.test.tsx                  one h1, metadata, JSON-LD, and every link in the HTML
tests/converter/bulk-conversion.test.tsx    multi-file /convert requests, per-file errors.json
tests/converter/conversion.test.tsx         the happy paths, media-type mismatch, archives, preview
tests/converter/extraction-tools.test.tsx   the two /tools pages (extract-tables, psd-to-layers)
tests/converter/failures.test.tsx           every status, the envelope, error.code never in the DOM
tests/converter/format.test.ts              bytes, durations, extensions
tests/converter/locked.test.tsx             a page locks its format, narrows its input, and cannot lie
tests/converter/preview.test.ts             escaping and the preview document
tests/converter/progress.test.tsx           the two phases of the meter
tests/converter/service.test.tsx            health, the phases, cancel, timeout, loading
tests/converter/zip.test.ts                 building/reading the archive responses client-side
tests/pdf/pdf-form-fields-compare.test.tsx  form-field detection and PDF diffing
tests/pdf/pdf-multi-tools.test.tsx          merge, split, organize and the other multi-file PDF tools
tests/pdf/pdf-sign-redact-edit.test.tsx     sign, redact and edit tool behaviour
tests/pdf/pdf-tools-pages.test.tsx          the /pdf/* pages themselves — one per tool
tests/pdf/pdf-tools.test.tsx                the shared PDF-tool plumbing (lib/pdf/pdfTools.ts and friends)
tests/pdf/pdfCoords.test.ts                 page-space ↔ screen-space coordinate math for PDF editing
tests/search/search-ui.test.tsx             the search box's own behaviour
tests/search/search.test.ts                 the search index built from every catalog
```

Two things are tested outside MSW, and both for the same reason — MSW's XHR
interceptor is missing a piece the contract depends on:

- **Cancellation.** Its `XMLHttpRequest` implements no `abort()` at all, so a
  cancelled request never reports itself as cancelled. `tests/api/transport.test.ts`
  and the cancel tests in `tests/converter/service.test.tsx` therefore run jsdom's own XHR
  against a real server on an ephemeral port, captured before MSW replaces the
  global.
- **The multipart body.** Asking a handler for `request.formData()` describes
  what the interceptor reconstructed, not what was sent. The part assertions
  read the bytes that actually arrived at a socket.

jsdom has no upload progress events either — its `XMLHttpRequest` never fires
`upload.onprogress` or `upload.onload` for a request that is merely in flight —
so the determinate half of the meter is covered by `tests/converter/progress.test.tsx` at
the component level, and the phase transition in context by a server that sends
its response headers and then stalls.

`jsdom` is pinned to `^29.1.1`. Vitest's jsdom `Request` shim reaches into
jsdom's private `Blob` internals, which jsdom 30 replaced; on 30, every XHR
upload throws before it leaves the client.

## Not done

- **The browser pass, in full.** It has been run further than before: the landing
  page, a conversion page and the converter were rendered in headless Chromium at
  360 px and 1440 px, in light and dark, and the built stylesheet was checked to
  contain the `:has()` filter rules and stay inside the approved palette. Still
  unverified by eye: **keyboard-only traversal**, **200 % zoom**, and
  **`prefers-reduced-motion`** in a real browser. Those three are asserted where
  they can be asserted without a viewport (the focus rules, the reduced-motion
  block), but "it behaves" is not the same as "it looks right", and neither has
  been watched. The audio, video and PDF-tool surfaces are newer than that pass
  and have not had one of their own.
- **The end-to-end run against the service.** The request and response shapes
  were confirmed against the running service with real documents — a real
  `.docx` to `pdf`, `txt` and a `.pptx` to a ZIP of page images, checking
  `Content-Type`, `Content-Disposition` and `X-Request-Id` on each — but the full
  flow through the page, in a browser, has not been driven. Note that it cannot be
  driven from a local `npm start`: the deployed API's CORS allows only
  `https://converter.alakbaroff.com`, so a page served from `localhost` gets a
  correct but unhelpful "the server could not be reached".
- **`robots.txt` and the sitemap are not submitted anywhere.** They exist and are
  correct; nothing has been registered with a search console, so nothing has been
  indexed yet.
- **No OG image.** Link previews fall back to the title and description. A
  generated one would need `app/opengraph-image.tsx` and a font, and there is no
  `public/` directory — which the Dockerfile explicitly notes would need its own
  `COPY` line.
