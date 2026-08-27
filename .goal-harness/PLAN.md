# PLAN

## Classification

- Size: large
- Domain Profile: general plus integrated SEO/GEO/AEO and funnel audit

## Phase 1: Baseline and risk repair

- Fix consent, dependency, JSON-LD, typecheck, RPC, and calculator error paths.
- Test point: lint, typecheck, unit tests, production dependency audit.
- Recovery: dependency lockfile and source diff allow full rollback.

## Phase 2: Search and conversion implementation

- Fix route-specific static HTML, `/blog` duplication, article fallback, crawler coverage, calculator SSR content, sitemap, robots, metadata, CTA and conversion events.
- Test point: build artifacts, H1/canonical/hreflang/script assertions, local route smoke.
- Recovery: routing and metadata changes are isolated by file.

## Phase 3: Quality gates and handoff

- Add CI, README, tests, state and measurement plan; run independent reviews.
- Test point: complete command suite and diff review.
- Recovery: source and routing changes remain revertible in Git; no hosting or database mutation is performed.

## Phase 4: Post-review repair and GitHub handoff

- Use two Luna/max read-only lanes for stored-HTML security and search/consent/operation parity.
- Repair substantiated findings with shared safety utilities and focused tests.
- Run lint, typecheck, unit tests, build, dependency audit and artifact assertions.
- Use a Sol/high reliability reviewer as the final security gate.
- Commit an explicit allowlist and push only to `origin/main`; do not run hosting or database deployment commands.
