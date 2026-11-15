# Thumbnail Studio

Local implementation only; deploy explicitly after verification.

- Route: `/dashboard/thumbnails`; linked from Home and dashboard navigation.
- Shared Fox Credits badge appears on all dashboard-shell pages, including Home and mobile. It reads the authenticated `/api/billing/credits` balance, refreshes on route/focus/visibility changes and every 30 seconds while visible, and refreshes immediately after thumbnail balance updates. Preview balances are marked DEMO.
- Local UI-only preview: `/ui-preview?view=thumbnails`. Its sample balance is explicitly labelled and generation is disabled; it never calls the thumbnail API. The preview route is unavailable in production.
- Up to three optional JPG/PNG/WebP photos, 2 MB each. Inputs go to Google Gemini; reference uploads are not persisted.
- One free successful image per user per calendar day in Asia/Kolkata. No rollover. Afterwards, 10 existing Fox Credits per image (including variations). Failed attempts release the free slot or refund reserved credits.
- Existing active/trial credit eligibility is respected; everyone signed in can use the daily free image even without paid access. Expired plan credits cannot be spent.
- Server-side pricing, same-origin checks, streamed 9 MB request limit, per-user lock, one pending job, six attempts per ten minutes, scoped image reads, stable idempotency IDs. The submitted maximum price prevents a stale free quote from silently charging credits.
- Paid reservations and jobs commit atomically. Failure refunds only once. Crashed jobs expire after five minutes and recover on the user's next status/generation request. Period rollover refunds never inflate a new period's allowance. No transaction is held while calling Gemini.
- Recent generated images are stored privately in Postgres; older image bytes beyond the six retained results are pruned on a subsequent generation. Job metadata is retained for quota and idempotency. Account deletion cascades through all jobs.
- Replaying a request for a pruned image returns HTTP 410 without generating or charging again.
- Download produces a 1280×720 JPEG, containing rather than cropping the AI result.

## Setup

1. Apply `db/migrations/006_thumbnails.sql` to the intended database (the existing migration runner includes it). Do not point local tests at production.
2. Set server-only `THUMBNAIL_API_KEY` for Gemini, or use the existing `GEMINI_API_KEY`. Image generation must be available/billed on that Google project. Set `THUMBNAIL_MODEL=gemini-2.5-flash-image` or a compatible image model. Never use `NEXT_PUBLIC_` for the key.
3. Provider endpoint is fixed to Google's API, with a 90-second timeout. Allow at least 120 seconds for the app request at your proxy/host. No live provider call is needed for mocked automated tests.
4. Test free generation, repeated request IDs, paid generation, failure/refund, concurrent submissions, owner-only image access, uploads, download, and next-day reset on an isolated database. Then smoke-test a real image with a configured image-enabled key before release.

Provider documentation: https://ai.google.dev/gemini-api/docs/image-generation

## Verification status

Local production build and TypeScript checks passed. Automated coverage includes pricing, request replay, refund handling, upload validation, ownership filtering and preview isolation, using mocked database/provider calls. Desktop and mobile preview were inspected. The migration has not been applied to the configured remote database; a real provider generation and isolated PostgreSQL integration test remain release prerequisites. This work has not been deployed.

2026-10-09 provider check: configured Gemini key can read `gemini-2.5-flash-image` metadata (HTTP 200). One neutral image-generation smoke request returned HTTP 429 `RESOURCE_EXHAUSTED`; no image was produced. Resolve Google project image quota/rate limits and billing before release. `node scripts/check-thumbnail-provider.mjs` checks model access; add `--generate` only to explicitly make one billable test request. Neither mode prints credentials.
