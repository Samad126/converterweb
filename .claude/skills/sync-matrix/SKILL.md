---
name: sync-matrix
description: Regenerate the frontend file matrix from the backend and confirm pages and search still cover every pair.
---
1. `cd ../backend && npm run build`
2. `node scripts/gen-file-matrix.mjs`
3. If a new source extension appeared, add it to a category (and an alias group if it is an alternate spelling) in `lib/files/fileCatalog.ts`.
4. `npm run typecheck && npm test` (`tests/search/every-pair.test.ts` checks every page is searchable).
