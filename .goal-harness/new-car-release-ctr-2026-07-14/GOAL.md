# GOAL

## Final Deliverable

Audit Cartain 2026년 하반기 신차 출시 일정 page for fresh-data accuracy, search CTR, AdSense readiness, and site quality; make no live change unless the verified source, release path, and validation support it.

## User Value

Ensure crawlers and no-JavaScript readers receive the actual article rather than a generic site shell, so the page title, H1, body, and structured data describe the same search intent.

## Required Features

- Record fresh GSC and live-page evidence.
- Repair article static pre-rendering so its root HTML has one article H1 and the article body.
- Preserve client rendering, API data access, canonical metadata, and publishing behavior.

## Non-Goals

- Editing or publishing the volatile 2026 release-schedule claims.
- Changing production data, advertisements, credentials, or scheduled publishing.

## Done Conditions

- Lint and production build pass.
- Generated target page has one H1 that matches the article title and has article content instead of generic shell copy.
- Live deployment is not performed until the reviewable Git change is merged through the normal GitHub/Vercel path.

## User-Visible Result

Search engines receive a consistent, indexable article page. Content-freshness improvements remain a separate editorial task requiring official sources.
