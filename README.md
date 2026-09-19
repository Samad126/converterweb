# File converter — web client

One page, one job: pick a file, pick an output format, get the converted file
back. Next.js (App Router) + TypeScript + Tailwind, tested with Vitest, React
Testing Library and MSW.

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
npm run test         # vitest, 117 tests
npm run lint         # eslint
npm run typecheck    # tsc --noEmit, strict
npm run gen:api      # regenerate lib/api-types.ts from openapi.json
```

Requires Node 20 or newer. There are no fonts, scripts or stylesheets fetched
from anywhere at runtime: the type is the system stack, so the page renders the
same on a machine that has never been online.

## Where the API base URL comes from

`NEXT_PUBLIC_CONVERTER_BASE_URL`, read once in `lib/api.ts`, **defaulting to
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
already 120 seconds, and it would hold a second copy of a 25 MiB upload in
memory while streaming it through.

## The API types cannot drift from the spec

`openapi.json` is the contract, and `lib/api-types.ts` is generated from it by
`openapi-typescript`:

```bash
npm run gen:api
```

The output is committed and never edited by hand — `lib/contract.ts` is the only
file that reaches into its shape, so a regeneration that renames something
breaks at compile time in one place rather than in twenty call sites.

## What the code is built on

| Rule | Where it lives |
| --- | --- |
| `POST /convert/{target}`; no bare `/convert` | `lib/api.ts` |
| A `200` must carry the target's own media type, charset ignored | `lib/formats.ts` (`expectedMediaType`), checked in `lib/useConverter.ts` |
| A non-2xx carries the JSON envelope; `error.message` shown verbatim | `lib/errors.ts` (`readErrorMessage`, `failureFromResponse`) |
| A body that is missing or not JSON falls back to `HTTP <status>` | `lib/errors.ts` (`fallbackMessage`) |
| `error.code` is never displayed | `ErrorNote` is never given it; asserted in `tests/failures.test.tsx` |
| The matrix comes from `GET /formats` at runtime | `lib/formats.ts`, and the whole of `tests/matrix.test.tsx` |
| Image targets are archives, decided by `multiple` | `lib/constants.ts`, `lib/formats.ts` (`downloadExtension`) |
| Both RFC 6266 filename forms, `filename*` preferred | `lib/contentDisposition.ts` |
| Exactly one `file` part, as `application/octet-stream` | `lib/api.ts`, asserted byte-for-byte in `tests/transport.test.ts` |
| 26214400 bytes, checked before the request | `lib/constants.ts`, `lib/useConverter.ts` (`selectFile`) |
| The client gives up at 120 s, after the server's 90 s | `lib/constants.ts` (`CLIENT_ABORT_MS`) |
| `X-Request-Id` shown under an error with a copy button | `components/ErrorNote.tsx` |
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
- A client-side refusal (wrong extension, over 25 MiB) never reached the server,
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

## Visual design: strict black and white

Achromatic only. There is no hue in the app and there cannot be one: the whole
Tailwind colour namespace is cleared in `app/globals.css`
(`@theme { --color-*: initial }`), so `bg-red-500` is not a class that exists,
and every colour resolves through the tokens in `:root`.

`tests/achromatic.test.ts` compiles the stylesheet through the real Tailwind
pipeline and reads every colour out of the declarations — hex, `rgb()`,
`hsl()`, `oklch()` and the 148 CSS named colours — failing if any of them has a
hue. It is how the rule survives the next person who wants a "success green".

Meaning comes from type size and weight, the weight of a rule (1 px hairline
against 2 px emphasis), whitespace, and inversion — a black block on white for
the result, white on black for the primary action. Errors are a 2 px black left
rule with a bold **Error** label; success is an inverted chip with a check
glyph. Dark mode is a straight inversion of the same tokens under
`prefers-color-scheme`.

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
tests/contentDisposition.test.ts   the two RFC 6266 forms, decoding, sanitising
tests/transport.test.ts            the real multipart bytes, abort, the 120 s deadline
tests/conversion.test.tsx          the happy paths, media-type mismatch, archives, preview
tests/failures.test.tsx            every status, the envelope, error.code never in the DOM
tests/matrix.test.tsx              the picker follows /formats; no hard-coded matrix
tests/service.test.tsx             health, the phases, cancel, timeout, loading
tests/progress.test.tsx            the two phases of the meter
tests/errors.test.ts               the envelope, our sentences, status → recovery
tests/format.test.ts               bytes, durations, extensions
tests/preview.test.ts              escaping and the preview document
tests/achromatic.test.ts           the black-and-white rule, compiled
```

Two things are tested outside MSW, and both for the same reason — MSW's XHR
interceptor is missing a piece the contract depends on:

- **Cancellation.** Its `XMLHttpRequest` implements no `abort()` at all, so a
  cancelled request never reports itself as cancelled. `tests/transport.test.ts`
  and the cancel tests in `tests/service.test.tsx` therefore run jsdom's own XHR
  against a real server on an ephemeral port, captured before MSW replaces the
  global.
- **The multipart body.** Asking a handler for `request.formData()` describes
  what the interceptor reconstructed, not what was sent. The part assertions
  read the bytes that actually arrived at a socket.

jsdom has no upload progress events either — its `XMLHttpRequest` never fires
`upload.onprogress` or `upload.onload` for a request that is merely in flight —
so the determinate half of the meter is covered by `tests/progress.test.tsx` at
the component level, and the phase transition in context by a server that sends
its response headers and then stalls.

`jsdom` is pinned to `^29.1.1`. Vitest's jsdom `Request` shim reaches into
jsdom's private `Blob` internals, which jsdom 30 replaced; on 30, every XHR
upload throws before it leaves the client.

## Not done

- **The browser pass.** The visual check at 320 px and 1440 px, light and dark,
  keyboard-only, with `prefers-reduced-motion`, and at 200 % zoom has not been
  run: it needs a live service, and the service was mid-change. Everything it
  would have looked at is asserted where it can be asserted without a viewport
  (the achromatic compile, the focus and contrast rules in CSS, the reduced
  motion block), but "it looks right" is still unconfirmed by eye.
- **The end-to-end run against the service.** The request and response shapes
  were confirmed against the running service with real documents — a real
  `.docx` to `pdf`, `txt` and a `.pptx` to a ZIP of page images, checking
  `Content-Type`, `Content-Disposition` and `X-Request-Id` on each — but the
  full flow through the page, in a browser, has not been driven.
