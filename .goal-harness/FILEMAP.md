# FILEMAP

## Existing Files

| File | Role | Notes |
|---|---|---|
| `src/pages/Calculator.tsx` | Primary conversion flow | Validates single/compare inputs and emits `calculator_completed` |
| `src/lib/analytics.ts` | Consent-safe measurement | Storage failures default denied; initializes GA and pageviews |
| `api/ssr.ts` | Crawler HTML handler | Shared metadata and sanitized article rendering |
| `vite.config.ts` | Production build and static SEO generation | Uses shared content safety utilities |
| `api/admin.ts` | Authenticated content administration | Atomic, retry-safe queue and post writes |
| `vercel.json` | Canonical hosting route contract | Vercel-only redirects, rewrites, cache and security headers |
| `.github/workflows/quality.yml` | CI quality gate | Lint, typecheck, tests, build, artifact verification, runtime audit |

## New Files

| File | Role | Notes |
|---|---|---|
| `api/_lib/contentSafety.ts` | Shared HTML/URL/slug safety policy | Used by SSR, admin and build paths |
| `api/_lib/contentSafety.test.ts` | Adversarial safety tests | Protocol, executable markup, escaping and containment |
| `api/ssr.test.ts` | Bot-handler regression tests | Exercises actual server handler with mocked data |
| `api/admin.test.ts` | Admin integrity tests | Proves atomic batch shape and retry/collision behavior |
| `src/lib/seoPolicy.ts` | Shared magazine metadata policy | Search noindex and pagination canonical parity |
| `src/lib/adScripts.ts` | Consent-gated AdSense loader | Testable imperative request boundary |
| `scripts/verify-build.mjs` | Generated artifact validator | CI-verifiable search and pre-consent assertions |
| `PROJECT_STATE.md` | Canonical continuation record | Current scope, verification, risks and next actions |
