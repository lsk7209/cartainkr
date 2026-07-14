# EVIDENCE

## Validation Level

Level: 3 — fresh first-party GSC baseline, live public HTML audit, source trace, lint, production build, merged Vercel production deployment, and live artifact assertions.

## Commands Run

| Command | Result | Notes |
|---|---|---|
| harness-init.py | PASS | size=medium, domain=adsense-audit, created=2026-07-14T14:05:36+09:00 |
| Node parse of current GSC opportunity snapshot | PASS | Snapshot generated 2026-07-14T02:34:24.503Z; date range 2026-06-15 through 2026-07-13. |
| Live endpoint audit: target page, robots, sitemap, ads.txt, about, contact | PASS | All returned 200; `/privacy-policy` is not the site route — `/privacy` is the implemented policy route. |
| `npm run lint` | PASS | ESLint completed with no errors. |
| `npm run build` | PASS | Vite production build completed. Local article pre-render verification was unavailable because the local Turso environment contains placeholders, not credentials. |
| `git diff --check` | PASS | No whitespace errors in the code diff. |
| Production live assertion after merged PR #2 | PASS | HTTP 200; one exact target H1; target-specific initial HTML; self-canonical; Article JSON-LD. |

## Test Results

| Test | Result | Notes |
|---|---|---|
| GSC opportunity | PASS | `2026년 신차 출시 일정`: 55 impressions, 1 click, average position 6.9273. |
| Initial HTML relevance | FAIL — fixed in code | Live target had a generic Cartain root shell, two H1 elements, and only a target title/description noscript block. |
| Static route root cause | PASS | `vite.config.ts` wrote article-specific metadata but retained the generic `index.html` root shell; it also read only file-loaded Turso values, not Vercel process variables. |
| Static article rendering implementation | PASS | Production initial HTML now contains target-specific article content with the stored body H1 removed from the static shell. |
| Production artifact assertion | PASS | The deployed target returns one exact H1, no generic site shell, matching canonical, and Article JSON-LD. |
| Content freshness | NEEDS EDITORIAL WORK | The volatile release-schedule article needs official manufacturer source links and clear confirmed/expected/unknown labels; no claim was changed automatically. |

## Failed Checks

- The local `.env.production.local` has placeholder `TURSO_URL` and `TURSO_TOKEN` values. No secret was read or printed. The production artifact must be checked after the Git-connected Vercel build.

## Fixes Applied

- `vite.config.ts`: consume existing `process.env.TURSO_URL/TURSO_TOKEN` during Vercel builds.
- `vite.config.ts`: replace the generic static root and duplicate noscript H1 for each pre-rendered article with sanitized article-specific HTML, one H1, existing canonical/meta/schema, and internal navigation.

## Completion Evidence

- PR #1 (`cfb64bf`) delivered article-specific initial HTML; PR #2 (`cead555`) removed the redundant stored-content H1.
- Final live verification passed after the Git-connected Vercel production deployment.
