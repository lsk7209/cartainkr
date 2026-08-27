# CartainKR Project State

## Purpose

Maintain a Korean automotive information site built with Vite, React, TypeScript, serverless API handlers, Turso, and legacy Supabase assets.

## Current Work

Production serverless recovery on 2026-08-28: the posts, admin and SSR outage was isolated to an incompatible serverless Node floor, repaired locally with an exact runtime contract, and verified with real entry bundling. Independent review and GitHub push are in progress; live recovery remains pending the external rollout.

## Repository Baseline

- Remote: `https://github.com/lsk7209/cartainkr.git`
- Branch: `main`
- Reviewed commit: `81448ff`
- Local implementation commit: `8371f79`.
- GitHub push was authorized but the current execution environment rejected the external write because approval was unavailable. Hosting deployment and external service mutations remain outside this handoff.
- The prior commits are now confirmed on `origin/main` at `167e523`; a new recovery commit is pending.

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
- Serverless runtime narrowed to Node `^22.12.0`, matching `sanitize-html@2.17.7`; CI now exercises the exact 22.12.0 floor.
- All five top-level API entries are packaged by the installed `@vercel/node` builder, materialized in isolated temporary directories and imported by `npm run verify:serverless`.

## Validation

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: 12 files and 42 tests passed.
- `npm run build`: passed with 2,586 modules; article prerender was skipped because Turso credentials were not present.
- `npm audit --omit=dev`: zero vulnerabilities.
- `npm run verify:build`: seven route artifacts have one H1, matching canonical/ko hreflang/robots, no pre-consent third-party origin, required privacy disclosures and crawler rules.
- `npm run verify:serverless`: all five locally built Vercel handlers initialized with their traced files; the same verifier and focused regression passed on exact Node 22.12.0.
- The verifier covers local Vercel dependency tracing plus exact-runtime import; hosting production runtime selection and live endpoints remain post-push checks.
- Sol/high final follow-up found no unresolved BLOCKER/HIGH; Terra/medium confirmed SSR/consent/CI gaps resolved.
- Recovery review: Terra/medium and Sol/high found no code-level BLOCKER/HIGH and approved commit/push; live endpoint recovery remains unverified until rollout.

## Current Risks

- Production `/api/posts`, `/api/admin`, and `/api/ssr` remain failed until the GitHub change is rolled out; the local cause/fix is verified but live recovery is not yet claimed.
- The user-supplied Turso read-write token was used only through masked process input and must be revoked/replaced; it is not stored in the repository.
- Build success does not cover Turso-backed article prerender or production serverless routing.
- The new Supabase permission migration is local-only until separately applied.
- Historical Vercel OIDC credentials found in Git history require rotation verification outside the repository.
- Existing production content includes large clusters of similar templated articles; bulk consolidation requires production data review and redirect decisions.
- Full dependency audit retains development-tool advisories; production dependency audit is clean.
- Calculator validation and event wiring are covered, but browser-level tests for exact `calculator_completed` event order/count remain open.

## Next Actions

1. Complete Terra/Sol review, resolve substantiated findings, and push the allowlisted recovery commit to GitHub only.
2. After the external rollout, recheck posts/admin/SSR status without mutating Vercel settings.
3. Revoke the exposed Turso read-write token and replace operational diagnostics with a read-only token.
4. Apply the Supabase permission migration only under separate approval, then verify production search/conversion signals and remeasure on 2026-09-11.
