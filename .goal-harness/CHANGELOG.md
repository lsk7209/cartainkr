# CHANGELOG

## Changed Files

| File | Change | Reason |
|---|---|---|
| `.goal-harness/*` | Added review harness and evidence | Preserve objective, checks, risks, and completion state |
| `PROJECT_STATE.md` | Added canonical project state | Enable reliable continuation in later sessions |
| Consent, analytics, admin and ad modules | Consent-gated measurement and in-memory-only admin key | Privacy and credential safety |
| Calculator modules and tests | Input validation and stable loan calculation | Prevent invalid results and prove conversion behavior |
| SSR, Vite, middleware, Vercel, sitemap, robots | Route, metadata, crawler, JSON-LD, canonical and article-fallback repair | Organic and AI-search accessibility |
| Package files and CI | Secure dependency upgrades, typecheck/test scripts, quality workflow | Automated regression prevention |
| Supabase migration | Restrict publishing-schedule RPC execution | Least privilege |
| README and project state | Replace placeholder docs and record operating boundaries | Resumability and safe operation |

## Final Hardening

| Area | Change | Reason |
|---|---|---|
| `api/_lib/contentSafety.ts` and tests | Shared parser sanitizer, escaping, URL and slug/path validation | Prevent stored markup execution and generated-path escape |
| `src/lib/seoPolicy.ts` and SSR tests | Shared query/page metadata and actual bot-handler coverage | Keep SPA and crawler search state coherent |
| Analytics, AdSense and affiliate tests | Safe consent storage plus behavior-level request gates | Default deny without breaking calculator/content routes |
| `api/admin.ts` and handler tests | Atomic retry-stable queue and post/queue write batches | Prevent partial production writes and unsafe retries |
| `scripts/verify-build.mjs` and quality workflow | Deterministic route artifact verification and runtime audit | Make search/privacy evidence reproducible in CI |
| Hosting/workflows | Removed Netlify leftovers and mutating content workflows | Keep one hosting contract and reviewed publishing boundary |

## Serverless Recovery

| Area | Change | Reason |
|---|---|---|
| Node runtime contract | Narrowed the application engine to `^22.12.0` | Match the minimum supported by the retained sanitizer and prevent serverless module-init failure |
| Quality CI | Pinned the verification job to Node 22.12.0 | Exercise the declared deployment floor instead of an unspecified 22.x patch |
| Runtime regression | Added an engine-contract test and a five-entry `@vercel/node` builder/materialization verifier | Reproduce the deployment packaging seam outside normal Vitest transforms and prevent recurrence |
