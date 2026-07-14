# PLAN

## Classification

- Size: medium
- Domain Profile: adsense-audit

## Phase 1

- Objective: Establish the live and repository baseline.
- Tasks: Record fresh GSC rows, inspect live page and public policy endpoints, trace static article pre-rendering.
- Expected Files: EVIDENCE.md, STATUS.md.
- Completion Criteria: A reproducible root cause and a bounded change surface are identified.
- Test Point: Live HTML shows generic root content and duplicate H1s.
- Rollback/Recovery: Read-only phase; no rollback required.

## Phase 2

- Objective: Repair static article initial HTML.
- Tasks: Replace only the article page app shell during build with sanitized article content, one H1, and existing internal links.
- Expected Files: vite.config.ts.
- Completion Criteria: Static article shell no longer contains generic site H1/copy or a duplicate noscript H1.
- Test Point: Lint, build, and direct checks of the generated target HTML.
- Rollback/Recovery: Revert the single config-file commit; runtime SSR/API remains unchanged.

## Phase 3

- Objective: Complete acceptance and controlled delivery.
- Tasks: Record evidence, document the remaining editorial freshness gap, commit scoped files, and open a PR. Deploy only after merge through the Git-connected Vercel workflow.
- Expected Files: harness docs and continuity docs.
- Completion Criteria: Acceptance cites fresh validation and no unreviewed files are staged.
- Test Point: Git diff and PR status.
- Rollback/Recovery: Git revert after merge if live verification fails.
