# Runbook

## Article static HTML release check

1. Merge the reviewed change through GitHub.
2. Confirm the connected Vercel build can access `TURSO_URL` and `TURSO_TOKEN` without printing them.
3. Check the build log for article pre-rendering.
4. Fetch the canonical article and assert one H1, target-specific text, self-canonical, and Article JSON-LD.
5. If the page regresses, revert the scoped `vite.config.ts` commit and redeploy through GitHub.
