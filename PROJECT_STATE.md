# CartainKR Project State

## Purpose

Maintain a Korean automotive information site built with Vite, React, TypeScript, serverless API handlers, Turso, and legacy Supabase assets.

## Current Work

Repository review plus search-entry, conversion, security, consent, routing, dependency, testing, and documentation optimization on 2026-08-28.

## Repository Baseline

- Remote: `https://github.com/lsk7209/cartainkr.git`
- Branch: `main`
- Reviewed commit: `81448ff`
- GitHub push was authorized after local verification; hosting deployment and external service mutations remain outside this handoff.

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

## Validation

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: 11 files and 40 tests passed.
- `npm run build`: passed with 2,586 modules; article prerender was skipped because Turso credentials were not present.
- `npm audit --omit=dev`: zero vulnerabilities.
- `npm run verify:build`: seven route artifacts have one H1, matching canonical/ko hreflang/robots, no pre-consent third-party origin, required privacy disclosures and crawler rules.
- Sol/high final follow-up found no unresolved BLOCKER/HIGH; Terra/medium confirmed SSR/consent/CI gaps resolved.

## Current Risks

- Build success does not cover Turso-backed article prerender or production serverless routing.
- The new Supabase permission migration is local-only until separately applied.
- Historical Vercel OIDC credentials found in Git history require rotation verification outside the repository.
- Existing production content includes large clusters of similar templated articles; bulk consolidation requires production data review and redirect decisions.
- Full dependency audit retains development-tool advisories; production dependency audit is clean.
- Calculator validation and event wiring are covered, but browser-level tests for exact `calculator_completed` event order/count remain open.

## Next Actions

1. Verify the pushed GitHub SHA, then stop; no hosting mutation is part of this task.
2. Apply the Supabase permission migration only after verifying the live function and role grants under separate approval.
3. Confirm historical OIDC token revocation/rotation in the external account.
4. After a separately authorized release, verify ordinary-user and crawler article URLs, sitemap, consent behavior, and `calculator_completed` in production.
5. Add calculator component/E2E conversion lifecycle coverage and remeasure GSC/Naver/GA4 on 2026-09-11.
