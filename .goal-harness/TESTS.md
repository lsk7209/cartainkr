# TESTS

## Required Checks

- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Unit tests: `npm test`
- Build: `npm run build`
- Dependency audit: `npm audit --omit=dev`
- Smoke test: generated route H1, canonical, hreflang, robots and consent-script assertions
- Domain-specific validation: adversarial stored-HTML, URL protocol and slug-containment tests
- Serverless compatibility: `npm run verify:serverless` bundles and initializes every top-level `api/*.ts` entry without relying on Vitest transforms
- Production read-only matrix: affected APIs versus sitemap/RSS/root, with status only and no credentials

## Error And Edge Cases

- Quoted and unquoted `javascript:` links, event handlers, forms, SVG and `srcdoc` are removed.
- Malicious title, excerpt, image URL and slug cannot break HTML attributes or escape `dist/magazine`.
- Search query bot HTML is `noindex, follow` with `/magazine` canonical.
- SPA navigation after a noindex search page resets robots to `index, follow`.
- Affiliate image and measurement script do not render without explicit consent.
- Common safety imports do not prevent Node serverless handlers from initializing.
- Working sitemap/RSS handlers remain unaffected by the recovery.

## User Scenario Tests

- Search crawler query: stable `/magazine` canonical with `noindex, follow` and escaped query.
- Stored malicious article: one H1, sanitized body, safe canonical/image and no executable markup.
- Consent unavailable/denied: calculator and content remain usable with no GA, AdSense or affiliate request.
- Consent granted: GA/pageview and AdSense initialize once; eligible affiliate banner renders.
- Admin retry: exact queue batch deduplicates; post and queue completion stay in one transaction.

## Completion Checklist

- [x] Available checks have been run or marked N/A with reasons.
- [x] Failed checks have been fixed or documented as bounded.
- [x] Acceptance criteria have matching evidence.
- [x] Recovery Sol reliability review has no unresolved code-level BLOCKER or HIGH finding.
- [ ] `origin/main` SHA matches the pushed local commit.

## Serverless Recovery Checks

- [x] Pre-fix engine-contract test failed against `^20.19.0 || >=22.12.0` and `sanitize-html >=22.12.0`.
- [x] `sanitize-html` load failed with `ERR_REQUIRE_ESM` on Node 20.18.1 and 22.11.0.
- [x] The same load passed on Node 20.19.5 and 22.12.0.
- [x] `npm run verify:serverless` passed for all five API entries on local Node 24.13.0.
- [x] The serverless verifier and focused Vitest regression passed on exact Node 22.12.0.
- [x] Full lint, typecheck, 42-test, build, artifact and runtime-audit gates passed after the fix.
