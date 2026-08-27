# RISKS

| Risk | Impact | Likelihood | Mitigation | Status |
|---|---|---|---|---|
| Turso-backed article prerender/server routes were not exercised with production credentials | Search article output could differ from mocks | Medium | Shared renderer tests, actual SSR handler mocks, post-push production smoke gate | BOUNDED |
| Supabase permission migration is local-only | Legacy RPC grants may remain broad | Medium | Apply only in a separately approved, inspected production change | EXTERNAL |
| Historical Vercel OIDC token rotation is unverified | Old credential may remain valid | Medium | Verify/revoke in the external account with separate authority | EXTERNAL |
| Calculator completion lifecycle lacks browser-level event-order test | KPI could regress without a component/E2E failure | Medium | Existing validation/formula/event tests; add tracking-mocked component/E2E coverage | OPEN MEDIUM |
| Development-only dependency audit reports advisories | Local tooling exposure | Low | Runtime audit is zero; schedule isolated toolchain remediation | ACCEPTED |

## Risk Notices

### GitHub push and security dependency

- Task: Harden server/build article rendering and push the verified change set to GitHub.
- Why Needed: A final review found stored-HTML injection and output-path risks not covered by the earlier regular-expression filter.
- Impact Scope: Build-time article HTML, crawler SSR, GitHub `main`; no hosting or database command.
- Rollback: Revert the resulting Git commit; the database and hosting configuration are not mutated directly.
- Safer Alternative: Keep the changes local, which would leave the remote code vulnerable and was superseded by the user's explicit go-ahead.
- Approval Needed: GitHub push was explicitly authorized by the user's continuation request; production migration and hosting operations remain unauthorized.
- Dependency: Add pinned `sanitize-html` plus its type package because a maintained parser-based allowlist is safer than extending a regular-expression HTML filter.
