---
paths:
  - "components/**"
  - "app/**"
---
- Pages must work at 400px width, and in light and dark themes.
- Prefer existing UI primitives in `components/ui`; keep tool logic in `lib/**` hooks.
- Add or update a Vitest test for behaviour you change; mock the API with MSW (`tests/msw`).
