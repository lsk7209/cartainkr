# Handoff

## Current Goal

Repair Cartain article static HTML so search crawlers receive the actual article rather than generic site copy.

## Completed

- Diagnosed the target 2026 new-car release page: its live static HTML had generic root content and duplicate H1s despite correct metadata.
- Updated `vite.config.ts` to build an article-specific static root and to consume Vercel process-level Turso variables.
- Passed lint and a production build without local database credentials.

## Next Step

After merge, confirm the Vercel build reports pre-rendered article pages, then fetch the target page and verify exactly one H1, article-specific body, canonical, and Article JSON-LD. Do not edit release-schedule claims until official sources support them.

## Evidence

See `.goal-harness/new-car-release-ctr-2026-07-14/EVIDENCE.md`.
