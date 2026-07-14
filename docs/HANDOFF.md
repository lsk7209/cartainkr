# Handoff

## Current Goal

Repair Cartain article static HTML so search crawlers receive the actual article rather than generic site copy.

## Completed

- Diagnosed the target 2026 new-car release page: its live static HTML had generic root content and duplicate H1s despite correct metadata.
- Updated `vite.config.ts` to build an article-specific static root, consume Vercel process-level Turso variables, and remove any stored article H1 from the static body.
- Merged PRs #1 and #2 and verified the Vercel production response: 200, one exact H1, target-specific initial content, self-canonical, and Article JSON-LD.

## Current Editorial Release

- A source-backed repair for `new-car-release-schedule-2026-second-half` has been sent to the production content API. It removes unsupported monthly launch rows and estimated prices, links to Hyundai-owned price/catalog pages, and states an explicit update standard.
- The pre-edit body is preserved in `.goal-harness/new-car-release-source-repair-2026-07-14/ROLLBACK.html`.

## Next Step

Monitor Search Console impressions/click-through rate for the corrected page before making another title or content change. Add future model-specific dates or prices only when a manufacturer-owned source supports each claim.

## Evidence

See `.goal-harness/new-car-release-ctr-2026-07-14/EVIDENCE.md` and `.goal-harness/new-car-release-source-repair-2026-07-14/EVIDENCE.md`.
