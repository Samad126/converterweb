---
name: add-conversion-page
description: Add or change conversion pages (document, file, audio/video) and verify they appear in routes, sitemap, finder and header search.
---
Pages are generated from catalogs, so edit the catalog, not a route.
- Documents: `lib/content/catalog.ts` (`SOURCES`, `PAIRS`, copy).
- Everything else: `lib/files/fileCatalog.ts` (needs `sync-matrix` first); media: `lib/media/mediaCatalog.ts`.
Then run `npm test`; check `/conversions` finder and the search for "<src> to <target>".
