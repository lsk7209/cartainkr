# CartainKR Project State

## Purpose

Maintain a Korean automotive information site built with Vite, React, TypeScript, serverless API handlers, Turso, and legacy Supabase assets.

## Current Work

Production serverless recovery on 2026-08-28: the first Node-floor repair reached GitHub and passed CI/deployment status, but the public posts, admin and SSR functions still failed during module initialization. The follow-up removes the CommonJS-to-ESM-only parser seam, adds production-mode Vercel function execution gates, and is committed locally pending GitHub push and public verification.

## Repository Baseline

- Remote: `https://github.com/lsk7209/cartainkr.git`
- Branch: `main`
- Current local and remote baseline: `ac12c2879000bc484c7a5a719d3d762eda79fd6d` on `main`.
- First recovery commits `e565192` and `ac12c28` were pushed by the user; GitHub Quality and the linked production deployment record passed.
- Local follow-up commit: `cbd5dc0` (`fix: remove serverless sanitizer module seam`); `origin/main` remains `ac12c28` until the user pushes.
- Hosting deployment and external service mutations remain outside this handoff.

## Implemented Improvements

- Explicit-consent loading for GA4 and AdSense, with consent withdrawal and first-consent pageview measurement.
- Primary `calculator_completed` conversion plus CTA, content, search, share, and result-action events.
- Calculator input validation, zero-interest handling, comparison validation, and a primary completion event.
- Admin bearer key removed from persistent browser storage.
- DOMPurify, React Router, PostCSS, Vite and related toolchain upgrades; production audit reduced to zero.
- Route-specific static HTML, canonical/hreflang, `/blog` consolidation, article SPA fallback, crawler coverage, sitemap and robots repair.
- Calculator crawler HTML expanded with visible method, assumptions, official sources and JSON-LD.
- JSON-LD script serialization hardened and duplicate SSR article H1 removed.
- Public schedule RPC restriction migration added but not applied remotely.
- Parser-based stored-article sanitizer, safe URL/slug handling, output-path containment and adversarial SSR/build tests.
- Shared magazine search metadata policy for SPA and bot SSR, including query noindex and paginated canonical parity.
- Consent storage failures default denied; GA/pageview, AdSense and affiliate behavior are regression-tested.
- Admin queue and post/queue writes use atomic, retry-safe libSQL batches with collision checks.
- Mutating bulk publishing/backfill workflows and obsolete Netlify configuration removed; reviewed local scripts remain separately gated.
- Quality CI, deterministic build-artifact verification and real project README added.
- Serverless runtime remains pinned to Node `^22.12.0`; CI exercises the exact 22.12.0 floor.
- `sanitize-html` is pinned to `2.17.5`, which retains its security fixes while using the CommonJS-compatible `htmlparser2@10.1.0` export required by the affected serverless module graph.
- All six top-level API entries are installed and traced in an external temporary fixture by the production-mode `@vercel/node` builder, materialized, imported and safely invoked by `npm run verify:serverless`.
- `/api/release` returns only a no-store 12-character public Git commit fingerprint so the custom domain can be tied to the intended rollout without exposing runtime secrets.

## Validation

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: 13 files and 46 tests passed.
- `npm run build`: passed with 2,586 modules; article prerender was skipped because Turso credentials were not present.
- `npm audit --omit=dev`: zero vulnerabilities.
- `npm run verify:build`: seven route artifacts have one H1, matching canonical/ko hreflang/robots, no pre-consent third-party origin, required privacy disclosures and crawler rules.
- `npm run verify:serverless`: production-mode dependency install and tracing selected `nodejs22.x` for six handlers on exact Node 22.12.0; admin returned 401, posts OPTIONS returned 204, release returned 200 and static SSR returned 200.
- The CommonJS/ESM dependency regression was observed red on `sanitize-html@2.17.7`, then passed with `2.17.5`; Node 20.18.1, 22.11.0 and 22.12.0 probes also loaded and sanitized the Cartain allowlist vectors.
- Adversarial sanitizer tests cover forbidden URL attributes, decimal/hex entity schemes, `srcset`, raw-text SVG/MathML mutation payloads and SMIL animation attributes.
- `npm audit --omit=dev`: zero vulnerabilities.
- Cost-first dependency, regression-design, test-evidence and final reliability/security reviews found no unresolved BLOCKER/HIGH.

## Current Risks

- Production `/api/posts`, `/api/admin`, and `/api/ssr` still return `FUNCTION_INVOCATION_FAILED` on the current public deployment; the follow-up fix is not live and recovery is not yet claimed.
- The user-supplied Turso read-write token was used only through masked process input and must be revoked/replaced; it is not stored in the repository.
- Build success does not cover Turso-backed article prerender or production serverless routing.
- The new Supabase permission migration is local-only until separately applied.
- Historical Vercel OIDC credentials found in Git history require rotation verification outside the repository.
- Existing production content includes large clusters of similar templated articles; bulk consolidation requires production data review and redirect decisions.
- Full dependency audit retains development-tool advisories; production dependency audit is clean.
- Calculator validation and event wiring are covered, but browser-level tests for exact `calculator_completed` event order/count remain open.
- Failed local fixture experiments left the recoverable, secret-excluded `C:\Users\dlatj\AppData\Local\Temp\cartain-vercel-fixture-v2MZbm` directory; policy prevented recursive removal. Repository recovery backups remain at `D:\web\cartainkr-corrupt-git-20260828-082541`, `D:\web\cartainkr-recovery-files-20260828-0827`, and `D:\web\cartainkr-ac12-recovery.tar` until the user approves cleanup.

## Next Actions

1. From `D:\web\cartainkr`, have the user run `git push origin main` and verify the remote SHA.
2. Verify GitHub Quality, then confirm `/api/release` matches the pushed commit and recheck posts/admin/SSR without mutating Vercel settings.
3. Revoke the exposed Turso read-write token and replace operational diagnostics with a read-only token.
4. Remove the listed recovery/temp artifacts only after explicit cleanup approval.
5. Apply the Supabase permission migration only under separate approval, then verify production search/conversion signals and remeasure on 2026-09-11.
