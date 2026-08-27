# RISKS

| Risk | Impact | Likelihood | Mitigation | Status |
|---|---|---|---|---|
| Turso-backed article prerender/server routes were not exercised with production credentials | Search article output could differ from mocks | Medium | Shared renderer tests, actual SSR handler mocks, post-push production smoke gate | BOUNDED |
| Supabase permission migration is local-only | Legacy RPC grants may remain broad | Medium | Apply only in a separately approved, inspected production change | EXTERNAL |
| Historical Vercel OIDC token rotation is unverified | Old credential may remain valid | Medium | Verify/revoke in the external account with separate authority | EXTERNAL |
| Calculator completion lifecycle lacks browser-level event-order test | KPI could regress without a component/E2E failure | Medium | Existing validation/formula/event tests; add tracking-mocked component/E2E coverage | OPEN MEDIUM |
| Development-only dependency audit reports advisories | Local tooling exposure | Low | Runtime audit is zero; schedule isolated toolchain remediation | ACCEPTED |
| Local recovery commits are not yet on GitHub | Remote does not contain the verified serverless recovery | High until pushed | From `D:\web\cartainkr`, run `git push origin main` and verify remote SHA | OPEN EXTERNAL |
| Posts/admin/SSR serverless handlers fail during invocation | Magazine data, admin access, crawler HTML and search entry can fail | High | Root cause reproduced; Node 22.12 floor and real entry bundle/init CI gate added; verify live only after external rollout | MITIGATED LOCALLY / LIVE PENDING |
| A user supplied a Turso read-write token in chat | Credential could be reused if retained or exposed | High | Never print/store/commit it; use only masked process input for SELECT; recommend immediate revocation and read-only replacement | OPEN EXTERNAL |
| Local builder verification uses development mode | CI proves dependency tracing and exact-Node handler import, but not the hosting platform's production runtime-selection branch | Medium | Keep package engine and exact-floor CI aligned; treat public endpoint smoke after rollout as the release gate | ACCEPTED / LIVE PENDING |

### Production Read-Only Diagnosis Risk Notice

- Task: identify and repair deterministic serverless initialization failures.
- Why Needed: deployed post/admin/SSR routes return `FUNCTION_INVOCATION_FAILED`, blocking search and content flows.
- Impact Scope: local source, tests, CI and GitHub `main`; production checks are GET/SELECT only.
- Rollback: revert the recovery commit. No live settings or data are changed.
- Safer Alternative: report the outage without repair, which does not satisfy the user's explicit fix request.
- Approval Needed: user explicitly authorized code repair and GitHub handoff. Vercel operations, database writes and credential management remain unauthorized.

## Risk Notices

### GitHub push and security dependency

- Task: Harden server/build article rendering and push the verified change set to GitHub.
- Why Needed: A final review found stored-HTML injection and output-path risks not covered by the earlier regular-expression filter.
- Impact Scope: Build-time article HTML, crawler SSR, GitHub `main`; no hosting or database command.
- Rollback: Revert the resulting Git commit; the database and hosting configuration are not mutated directly.
- Safer Alternative: Keep the changes local, which would leave the remote code vulnerable and was superseded by the user's explicit go-ahead.
- Approval Needed: GitHub push was explicitly authorized by the user's continuation request; production migration and hosting operations remain unauthorized.
- Dependency: Add pinned `sanitize-html` plus its type package because a maintained parser-based allowlist is safer than extending a regular-expression HTML filter.
