# TESTS

## Required Checks

- Run/start: N/A — static build change only.
- Lint: `npm run lint`.
- Typecheck: Covered by Vite production build; no separate typecheck script is defined.
- Unit tests: N/A — no unit test runner is configured.
- Build: `npm run build` with the existing local environment; it must pre-render article routes.
- Smoke test: Inspect `dist/magazine/new-car-release-schedule-2026-second-half/index.html`.
- Domain-specific validation: Assert exactly one H1 matching the article title, target-specific article text, no generic root title, self-canonical, and Article JSON-LD.

## Error And Edge Cases

- If Turso environment is unavailable, article pre-rendering is skipped; treat this as a validation blocker, not a release.
- Strip executable markup and inline event attributes before embedding stored article HTML into the static shell.
- Keep no-JavaScript content aligned with the same article title/body used by the client/API.

## User Scenario Tests

- A crawler receives the target article title, one matching H1, and target body from initial HTML.
- A normal browser still hydrates the existing React route and retrieves its post data through the unchanged API.

## Completion Checklist

- [x] Available checks have been run or marked N/A with reasons.
- [x] Failed checks have been fixed or documented as blocked.
- [x] Acceptance criteria have matching evidence.
