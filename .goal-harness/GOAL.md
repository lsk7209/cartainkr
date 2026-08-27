# GOAL

## Final Deliverable

Restore the deployed CartainKR post, admin, and crawler SSR serverless entrypoints from deterministic `FUNCTION_INVOCATION_FAILED` responses while preserving the stored-HTML, URL, slug, and output-path protections added in the prior optimization.

## User Value

Search visitors, ordinary SPA users, and administrators must be able to reach their data-backed routes without serverless module-load failure, while untrusted article data remains unable to execute markup or escape generated paths.

## Required Features

- A red-capable check that distinguishes failing serverless entrypoints from working sitemap/RSS functions.
- A confirmed root cause based on module/bundle evidence rather than deployment guesswork.
- The smallest complete compatibility fix with sanitizer, URL, slug, and path-containment behavior preserved.
- A regression check that loads or bundles real API entry modules outside Vitest-only transforms.
- Full lint, app/API typecheck, unit/integration tests, production build, artifact verification, runtime audit, independent review, and GitHub remote verification.

## Non-Goals

- No Vercel CLI/API/settings/environment/domain/deployment operations, production database writes, migration execution, Search Console submission, credential rotation, or bulk content changes.

## Done Conditions

- The production failure matrix is reproducible and the code-level cause is demonstrated by a local pre-fix regression check.
- All affected entry modules pass the new compatibility check after the fix.
- Existing 40 tests plus new regression coverage pass, along with lint, typecheck, build, artifact verification, and `npm audit --omit=dev`.
- No sanitizer, URL, slug, path-containment, consent, SEO, calculator, or admin-integrity regression is introduced.
- Sol/high final review has no unresolved BLOCKER/HIGH finding.
- The verified commit is pushed to `origin/main` and its remote SHA matches; hosting rollout remains external.

## User-Visible Result

Working data-backed magazine/admin/SSR code ready on GitHub for the existing hosting pipeline, with stored-content defenses and search/conversion improvements intact.
