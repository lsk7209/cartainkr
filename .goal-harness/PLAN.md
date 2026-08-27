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

## Phase 5: Production serverless recovery

Status: COMPLETE LOCALLY

- Objective: restore `/api/posts`, `/api/admin`, and `/api/ssr` after the deployed module-load failure.
- Tasks: preserve a deterministic production HTTP matrix; compare working/failing module graphs; test ranked hypotheses with one variable at a time; add a real entry-module compatibility check; implement the smallest safe fix.
- Expected files: `api/_lib/contentSafety.ts` or a split server/build safety module, focused tests, package/CI scripts if needed, harness and project-state documents.
- Completion criteria: affected modules pass the local compatibility check; prior sanitizer and slug/path tests remain green; no unrelated rewrite.
- Test point: focused regression, lint, app/API typecheck, full unit suite, production build, artifact verification, runtime audit.
- Recovery: revert the single recovery commit; no Vercel setting, database row, schema, credential, or live deployment mutation is performed.

## Phase 6: Independent review and GitHub handoff

Status: IN PROGRESS (reviews complete; commit/push pending)

- Run Terra/medium test review and Sol/high reliability review after implementation.
- Resolve all substantiated BLOCKER/HIGH findings and rerun affected checks.
- Stage an explicit allowlist, scan the staged diff for secrets, commit, push to `origin/main`, and verify the remote SHA.
- Stop at GitHub push; production rollout and live post-release smoke remain external read-only follow-up.
