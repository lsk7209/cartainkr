# GOAL

## Final Deliverable

Improve CartainKR's technical reliability, organic-search visibility, AI-search retrievability, consent compliance, and calculator conversion path with locally verified code changes.

## User Value

Search visitors should land on the intended page, understand the calculation method, complete a trustworthy ownership-cost calculation, and be measured only after consent.

## Required Features

- Correct route-specific static and crawler HTML.
- One canonical magazine route and usable article fallback.
- Consent-gated analytics and advertising.
- Stable calculator validation and conversion events.
- Safe JSON-LD serialization and restricted schedule RPC.
- Tests, typecheck, CI, run documentation, and evidence.

## Non-Goals

- No production deployment, database migration execution, Search Console submission, credential rotation, or bulk production-content deletion.

## Done Conditions

- Lint, typecheck, tests, and build pass.
- Production dependency audit reports zero vulnerabilities.
- Generated static routes have one route-specific H1, matching canonical/hreflang, and no static GA/AdSense scripts.
- Stored articles are sanitized in build and SSR paths, and slugs cannot escape the generated article directory.
- Consent storage failures default denied while core calculator and content routes remain available.
- The verified local commit is pushed to `origin/main` and the remote SHA matches.
- Remaining production-only boundaries are documented.

## User-Visible Result

A safer, measurable calculator funnel and search-ready page output, with GitHub handoff authorized and hosting deployment remaining a separate workflow.
