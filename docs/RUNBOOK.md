# Runbook

## Title-Only Search Experiment

1. Refresh first-party page/query data and record the exact page, query, baseline clicks, impressions, CTR, and average position.
2. Read the current public page and preserve its title, canonical, robots, and post ID for rollback.
3. Use the authenticated `/api/admin/update-post` endpoint for a title-only update when evidence confirms a concrete defect or opportunity.
4. Verify public SSR HTML, API row, canonical, robots, and cache headers after a Git-connected Vercel deployment.
5. Observe a full Search Console reporting window before another change; roll back through the same endpoint if the served metadata is wrong.

Do not change post body, publish dates, Search Console state, ads, or database schema as part of a title-only experiment.
