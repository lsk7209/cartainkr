# Handoff

## Current: Public content integrity repair (2026-08-29 23:17 KST)

- User goal: audit and improve the managed SEO fleet, using the latest GitHub `main` as the source of truth for Cartain.
- Source boundary: isolated worktree `D:\web\seo-worktrees\cartain-content-integrity-20260829`, branch `seo/cartain-content-integrity-20260829`, built from `origin/main` `17eaec7ddf6fc8d83762a7afb4fb1cccc73b5a36`. Implementation commit `0478d9caba7ab7297eec09a05be2568a4ee53019` was fast-forwarded to `main`. The dirty checkout at `D:\web\cartainkr` was not modified.
- Confirmed defect: the public API exposed 9 published rows containing Unicode replacement characters (`U+FFFD`). A representative Googlebot article response contained 588 replacement characters. The affected rows remain in the database; no production DB write or delete was performed.
- Implementation: reject replacement characters on queue and post writes; exclude corrupt rows from every public post query, crawler SSR, RSS, sitemap, and IndexNow submission; return a defense-in-depth noindex 404 if a corrupt detail row bypasses SQL filtering; redirect four common sitemap aliases to the canonical `/sitemap.xml` instead of returning the SPA shell with status 200.
- Affected slugs: `car-guide-2026-20260605-274y`, `car-guide-7-20260605-sthr`, `car-guide-10-20260605-ee0t`, `car-guide-vs-2026-20260605-p3ih`, `car-guide-20260514-mt94`, `car-guide-2026-20260514-mptr`, `car-guide-vs-5-20260514-q12v`, `car-guide-20260514-c1pg`, and `car-guide-2026-20260514-xsnr`.
- Fresh validation: focused Vitest 23/23; full Vitest 53/53; `npm run typecheck`; `npm run lint`; `npm run build`; build artifact verification 7/7 routes; serverless production-mode verification 6/6 entries; sitemap alias config assertion 4/4. GitHub Actions Quality run `33257281231` passed, and GitHub Production deployment `6156618193` succeeded for exact SHA `0478d9c`. Live assertions passed: all 9 corrupt APIs return 404; representative crawler HTML returns noindex 404 with zero replacement characters; a known-good API and crawler page remain 200/self-canonical; RSS and sitemap contain none of the 9 slugs; four sitemap aliases return 308 to `/sitemap.xml`; public count is 758.
- Side effects and rollback: `main` now contains implementation commit `0478d9c`; the Git-connected production deployment completed. `npm ci` installed local dependencies and reported 6 dependency audit findings (1 low, 2 moderate, 3 high); no dependency versions or lockfile were changed. Revert `0478d9c` if public behavior regresses.
- Known separate risk: normal browser initial HTML still receives the SPA root shell while bot user agents receive route-aware SSR. This parity issue needs a dedicated rendering change so the interactive SPA is not disabled; it is not silently bundled into the integrity patch.
- Deliberately not run: no Vercel CLI/API mutation, production DB mutation, content rewrite, or IndexNow submission.
- Single next step: continue the fleet audit with the separately confirmed Ehon365 crawler 500/thin SSR issue; keep Cartain browser-vs-bot initial HTML parity as a distinct rendering work item.

## Previous handoff (2026-07-14)

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
