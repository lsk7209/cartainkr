# EVIDENCE

## Initial Download Review (Historical)

### Validation Level

Level: 4 (production build and local preview smoke checks; production data-backed and serverless behavior unverified)

### Commands Run

| Command | Result | Notes |
|---|---|---|
| `harness-init.py` | PASS | Large general review harness created |
| `git clone https://github.com/lsk7209/cartainkr.git .` | PASS | Checked out `main` at `81448ff` |
| `npm ci` | PASS | 495 packages installed; 27 vulnerabilities reported |
| `npm run lint` | PASS | Passed on isolated retry |
| `npm run build` | PASS | 2,810 modules transformed; 7 static routes generated; Turso article prerender skipped |
| `npx tsc -b --pretty false` | FAIL | `vite.config.ts:448` unsafe row-array assertion |
| `npm audit --omit=dev --json` | FAIL | 13 production vulnerabilities: 11 high, 2 moderate |
| Local preview HTTP probes | PARTIAL | Main routes and robots returned 200; sitemap path returned HTML fallback |

### Test Results

| Test | Result | Notes |
|---|---|---|

### Failed Checks (Resolved in the Improvement Run)

- Typecheck fails at `vite.config.ts:448`.
- Dependency audit reports actionable production advisories.
- Local static preview cannot prove production serverless sitemap behavior.

### Initial Scope Boundary

- No product-code fix was authorized or applied; this task was a download and review.
- Initial lint/build concurrency exposed a transient Vite timestamp-file race; isolated lint retry passed.

### Initial Review Evidence

- Local clone, remote, branch, and commit verified.
- Static analysis, build, lint, typecheck, audit, and route smoke evidence recorded.
- Environment and production-routing limitations documented.

## 2026-08-28 Improvement Run

| Command or check | Result | Notes |
|---|---|---|
| `npm run lint` | PASS | No errors or warnings |
| `npm run typecheck` | PASS | Previous Vite row typing failure repaired |
| `npm test` | PASS | 3 files, 11 tests |
| `npm run build` | PASS | Vite 8 build; 6 route-specific static pages; Turso article prerender skipped without credentials |
| `npm audit --omit=dev` | PASS | 0 production vulnerabilities |
| Generated route assertions | PASS | One H1, route canonical/ko hreflang, no static GA/AdSense on calculator, magazine, about |
| `vercel.json` and `ai-index.json` parse | PASS | Valid JSON |
| Production route after changes | NOT RUN | GitHub push authorized; no hosting deployment performed |

Independent reliability review identified three findings. The admin key now stays in memory, compare mode uses shared validation with defensive loan guards, and first-consent pageview tracking subscribes to the consent event.

## 2026-08-28 Final Verification

| Command or check | Result | Notes |
|---|---|---|
| `npm run lint` | PASS | No errors or warnings |
| `npm run typecheck` | PASS | App, Vite configuration, server API and shared security modules |
| `npm test` | PASS | 11 files, 40 tests |
| `npm run build` | PASS | Vite 8.2.2; 2,586 modules; root plus 6 generated route pages |
| `npm run verify:build` | PASS | 7 routes: one H1, route canonical/hreflang/robots, no pre-consent third-party origins, privacy and robots assertions |
| `npm audit --omit=dev` | PASS | 0 runtime vulnerabilities |
| Actual SSR handler tests | PASS | Search noindex/canonical, malicious article fields, calculator metadata, invalid slug and 404 behavior |
| Consent behavior tests | PASS | Storage errors default denied; GA/pageview and AdSense load once after consent; affiliate URLs remain absent before consent |
| Admin handler tests | PASS | Atomic retry-stable queue batch, malformed input rejection, post/queue batch and collision rejection |
| Sol/high follow-up review | PASS | Both reliability findings resolved; no BLOCKER/HIGH |
| Terra/medium follow-up review | PASS WITH RESIDUAL | Prior SSR/CI/consent gaps resolved; calculator browser-level conversion lifecycle remains a MEDIUM test gap |

### External Boundaries

- Article prerender against Turso was skipped because `TURSO_URL` and `TURSO_TOKEN` were not present.
- The Supabase permission migration was not applied to production.
- No Vercel command, setting, alias, environment mutation or deployment was performed.
- Historical Vercel OIDC credential rotation/revocation remains unverified outside the repository.
- GSC, Naver and GA4 production baselines were unavailable locally; remeasurement target is 2026-09-11.
