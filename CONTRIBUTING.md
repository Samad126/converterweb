# Contributing to the converter web client

Thanks for helping out. This is the web client; the conversion API lives in a separate repo (`converterapi`) and is expected next to this one as `../backend`.

## Setup

You need Node 20 or newer.

```bash
npm ci
npm run dev        # http://localhost:3002
```

By default the client calls the API on the same origin. To point it at an API running elsewhere, set `NEXT_PUBLIC_CONVERTER_BASE_URL` (see `.env.example`). A different origin also needs CORS to allow your origin and to expose `X-Request-Id`, `Content-Disposition` and `Retry-After`.

## Before you open a pull request

```bash
npm run typecheck && npm run lint && npm test
```

To run one test file: `npx vitest run tests/search/<file>`.

## How the code is organised

- **Pages come from catalogs, not hand-written files.** Add content to `lib/content/catalog.ts` (documents), `lib/files/fileCatalog.ts` (file-to-file pages), `lib/media/*` (audio and video) or `lib/pdf/pdfTools.ts`. Header search and the `/conversions` finder derive from the catalogs, so a new page is searchable without extra wiring.
- **`lib/files/fileMatrix.ts` is generated** from the backend. Do not edit it by hand. After changing formats in the backend, run `npm run build` there, then `node scripts/gen-file-matrix.mjs` here.
- **Do not hard-code file extensions** in `lib/`, `app/` or `components/`, not even in comments. `tests/content/matrix.test.tsx` fails if you do. Derive them from the catalogs.
- **The API contract is `openapi.json`.** After changing it, run `npm run gen:api` to regenerate `lib/api/api-types.ts`.
- JPEG has its own pages, separate from JPG, on purpose (SEO). Please keep that.

## Tests

Tests use Vitest, React Testing Library and MSW. MSW stands in for the server, and an unexpected request fails the test on purpose. Add a handler for any new request your code makes. The jobs endpoint has no default handler that succeeds, so tests behave like an older server and the client falls back to the plain request.

## Commits

- Keep commits focused, and commit only files you changed.
- Use a short summary line, and explain why in the body when it is not obvious.
- Pushing to `master` deploys. There is no separate CI test run first, so run the checks above before you push.

## License

By contributing, you agree that your contribution is licensed under the project's MIT license.
