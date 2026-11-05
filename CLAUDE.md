# Converter web client (frontend)

Next.js (App Router) + TypeScript + Tailwind; tests with Vitest, React Testing Library, MSW. Talks to `../backend`. See README.md.

## Commands
- `npm run dev` (port 3002), `npm run build`, `npm run lint`, `npm run typecheck`
- `npm test` (all) or `npx vitest run tests/search/...` (one file)
- `npm run gen:api` regenerates `lib/api/api-types.ts` from `openapi.json`

## Architecture
- Pages are catalogs, not hand-written: `lib/content/catalog.ts` (documents), `lib/files/fileCatalog.ts` (`/files/{src}_to_{target}`), `lib/media/*` (audio/video), `lib/pdf/pdfTools.ts`.
- `lib/files/fileMatrix.ts` is GENERATED from the backend (`node scripts/gen-file-matrix.mjs` after `npm run build` in `../backend`). Never hand-edit it (a hook blocks it).
- Header search (`lib/search/*`) and the `/conversions` finder (`lib/content/conversionIndex.ts`) derive from the catalogs, so a new page is searchable with no extra wiring. `tests/search/every-pair.test.ts` proves it.
- JPEG has its own pages separate from JPG on purpose (SEO); keep that.

## Rules
- Do not hard-code file extensions in `lib/`, `app/`, `components/`; `tests/content/matrix.test.tsx` fails if you do (even in comments). Derive them from the catalogs.
- Run `npm run typecheck && npm test` before committing.
- Commit only files you changed; use `git -c core.fileMode=false` because of unrelated mode-only diffs.
