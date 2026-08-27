# TESTS

## Required Checks

- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Unit tests: `npm test`
- Build: `npm run build`
- Dependency audit: `npm audit --omit=dev`
- Smoke test: generated route H1, canonical, hreflang, robots and consent-script assertions
- Domain-specific validation: adversarial stored-HTML, URL protocol and slug-containment tests

## Error And Edge Cases

- Quoted and unquoted `javascript:` links, event handlers, forms, SVG and `srcdoc` are removed.
- Malicious title, excerpt, image URL and slug cannot break HTML attributes or escape `dist/magazine`.
- Search query bot HTML is `noindex, follow` with `/magazine` canonical.
- SPA navigation after a noindex search page resets robots to `index, follow`.
- Affiliate image and measurement script do not render without explicit consent.

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
- [x] Final Sol reliability review has no unresolved BLOCKER or HIGH finding.
- [ ] `origin/main` SHA matches the pushed local commit.
