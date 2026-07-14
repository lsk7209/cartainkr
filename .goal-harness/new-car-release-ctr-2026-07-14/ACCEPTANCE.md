# ACCEPTANCE

## Feature Criteria

| Criteria | Status | Evidence |
|---|---|---|
| Fresh data establishes a valuable page-one CTR target. | PASS | GSC snapshot: 55 impressions, 1 click, position 6.9273 for `2026년 신차 출시 일정`. |
| Initial article HTML is aligned with metadata and search intent. | PENDING DEPLOY | Code replaces generic shell/duplicate H1 with article title and sanitized body; requires Vercel build artifact proof. |
| Existing metadata, canonical, JSON-LD, API, and client rendering stay intact. | PASS (local) | Only static shell construction changed; lint and Vite build pass. |
| No volatile automotive claim is changed without official evidence. | PASS | No post data or editorial content was written. |

## User Flow Criteria

| Criteria | Status | Evidence |
|---|---|---|
| A crawler receives one target-specific H1 and article body before JavaScript. | PENDING DEPLOY | Must be checked from the Vercel build artifact/live response. |
| A normal user retains the existing React route and post API behavior. | PASS (source review) | No route/API/client component was modified. |

| Criteria | Status | Evidence |
|---|---|---|

## Stability And Error Handling

- Stored article HTML is stripped of executable tags, inline event handlers, and `javascript:` URLs before use in the static build shell.
- If database credentials are unavailable, the build retains the existing skip behavior rather than emitting partial pages.

## Documentation Criteria

- Harness and continuity documents record the defect, limits, release check, and editorial follow-up.

## Final Report Requirements

- implementation summary
- changed files
- validation level
- commands run
- acceptance status
- known limitations
- how to run

## Acceptance Status

PENDING — local code validation passed; production artifact and live response verification are required after PR merge.
