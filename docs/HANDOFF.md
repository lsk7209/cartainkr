# Handoff

## Current Goal

Repair Cartain article static HTML so search crawlers receive the actual article rather than generic site copy.

## Completed

- Diagnosed the target 2026 new-car release page: its live static HTML had generic root content and duplicate H1s despite correct metadata.
- Updated `vite.config.ts` to build an article-specific static root, consume Vercel process-level Turso variables, and remove any stored article H1 from the static body.
- Merged PRs #1 and #2 and verified the Vercel production response: 200, one exact H1, target-specific initial content, self-canonical, and Article JSON-LD.

## Next Step

Do not edit release-schedule claims until official sources support them. The next editorial revision should cite manufacturer sources and clearly separate confirmed, expected, and unknown releases.

## Evidence

See `.goal-harness/new-car-release-ctr-2026-07-14/EVIDENCE.md`.
