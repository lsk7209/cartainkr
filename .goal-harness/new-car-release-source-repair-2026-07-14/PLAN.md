# Goal: source-repair the 2026 second-half new-car article

## Done condition

- The public article does not present unverified launch months, prices, or model statuses as facts.
- It explains the evidence standard and links readers to manufacturer-owned confirmation paths.
- The previous body is stored locally for rollback, the production update is verified, and a GitHub-triggered Vercel rebuild serves the new static page.

## Plan

1. Preserve the current public payload as a rollback artifact.
2. Replace unsupported schedule assertions with a dated, source-linked verification guide.
3. Read back the public API and rendered page; assert one H1, source links, and no retired claims.
4. Trigger a GitHub/Vercel rebuild through a reviewable repository change and verify the live page.
