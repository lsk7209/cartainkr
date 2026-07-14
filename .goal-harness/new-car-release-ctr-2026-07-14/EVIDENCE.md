# EVIDENCE

## Validation Level

Level: 2 — fresh first-party GSC baseline, live public HTML audit, source trace, lint, and production build. Final DB-backed article artifact verification is deferred to the Git-connected Vercel build because local credentials are placeholders.

## Commands Run

| Command | Result | Notes |
|---|---|---|
| harness-init.py | PASS | size=medium, domain=adsense-audit, created=2026-07-14T14:05:36+09:00 |
| Node parse of current GSC opportunity snapshot | PASS | Snapshot generated 2026-07-14T02:34:24.503Z; date range 2026-06-15 through 2026-07-13. |
| Live endpoint audit: target page, robots, sitemap, ads.txt, about, contact | PASS | All returned 200; `/privacy-policy` is not the site route — `/privacy` is the implemented policy route. |
| `npm run lint` | PASS | ESLint completed with no errors. |
| `npm run build` | PASS | Vite production build completed. Local article pre-render verification was unavailable because the local Turso environment contains placeholders, not credentials. |
| `git diff --check` | PASS | No whitespace errors in the code diff. |

## Test Results

| Test | Result | Notes |
|---|---|---|
| GSC opportunity | PASS | `2026년 신차 출시 일정`: 55 impressions, 1 click, average position 6.9273. |
| Initial HTML relevance | FAIL — fixed in code | Live target had a generic Cartain root shell, two H1 elements, and only a target title/description noscript block. |
| Static route root cause | PASS | `vite.config.ts` wrote article-specific metadata but retained the generic `index.html` root shell; it also read only file-loaded Turso values, not Vercel process variables. |
| Static article rendering implementation | PARTIAL — follow-up in progress | Production now receives article-specific initial content, but stored content carries its own H1 in addition to the shell H1. A scoped normalization removes that redundant H1. |
| Local DB-backed output assertion | BLOCKED | Target `dist/magazine/.../index.html` is skipped when Turso credentials are unavailable locally. Vercel must provide its existing build variables for release validation. |
| Content freshness | NEEDS EDITORIAL WORK | The volatile release-schedule article needs official manufacturer source links and clear confirmed/expected/unknown labels; no claim was changed automatically. |

## Failed Checks

- The local `.env.production.local` has placeholder `TURSO_URL` and `TURSO_TOKEN` values. No secret was read or printed. The production artifact must be checked after the Git-connected Vercel build.

## Fixes Applied

- `vite.config.ts`: consume existing `process.env.TURSO_URL/TURSO_TOKEN` during Vercel builds.
- `vite.config.ts`: replace the generic static root and duplicate noscript H1 for each pre-rendered article with sanitized article-specific HTML, one H1, existing canonical/meta/schema, and internal navigation.

## Completion Evidence

- The source-level defect is isolated to build-time static article generation and has a reversible single-file fix.
- First production deployment confirmed target-specific content but exposed a duplicate H1 from stored article HTML; follow-up deployment verification remains required.
