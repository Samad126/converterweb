---
paths:
  - "lib/content/**"
  - "lib/files/**"
  - "lib/media/**"
  - "lib/search/**"
---
- One conversion = one page = one URL. If the document catalog covers a pair, the file catalog skips it (except deliberate JPEG pages).
- Search only widens matching; capability comes from the catalogs and `GET /formats`. Search must keep working when `/formats` fails.
- No literal file extensions in this code (see tests/content/matrix.test.tsx).
