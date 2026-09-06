# Implementation setup

Chosen adapters for this implementation. Hosted credentials are still required before production use. Isolated adapters are for local UI and automated tests only.

## Persistence

- **Production adapter:** Prisma + PostgreSQL (`APP_PERSISTENCE=postgres`). Requires `DATABASE_URL`.
- **Isolated adapter:** file-backed store under `.data/` (`APP_PERSISTENCE=isolated`). Not production persistence. Used when hosted PostgreSQL is not configured. Survives local process restarts; do not deploy it.

## Authentication

Staff sessions use signed HttpOnly JWT cookies (`jose`). There is no customer identity system and no public registration.

- Provision staff with `npm run staff:provision -- email@example.com 'password'`.
- `STAFF_ALLOWLIST` is a comma-separated email list. Login is rejected unless the email is both provisioned and allowlisted.
- `AUTH_SECRET` must be a long random value. Sessions expire after 12 hours.
- Mutations require a same-origin `Origin` or `Referer` matching `APP_URL`.

## Object storage

- **Production adapter (Vercel):** private Vercel Blob (`STORAGE_ADAPTER=blob`) plus `BLOB_READ_WRITE_TOKEN`. Catalogue reads go through `/api/media/public`; reference reads require staff.
- **S3 adapter:** not implemented. Do not set `STORAGE_ADAPTER=s3` in production.
- **Isolated adapter:** local files under `.data/storage/` (`STORAGE_ADAPTER=isolated`). Not a production store.

Guest uploads are authorised into quarantine, validated, re-encoded, then claimed only inside the order transaction.

## Snippe payments (Phase 2)

Quote-first collection is implemented and **disabled** (`SNIPPE_ENABLED=false`). Public catalogue stays price-free. Staff publish a TZS quote, copy a private link, and the customer explicitly pays on hosted Snippe checkout.

Verified contract notes and open gaps: [SNIPPE-PROVIDER-CONTRACT.md](SNIPPE-PROVIDER-CONTRACT.md).

Webhook URL to register: `{APP_URL}/api/webhooks/snippe`.

Set `SNIPPE_API_KEY` and `SNIPPE_WEBHOOK_SECRET` in the ignored server environment only. Initiation stays off until `SNIPPE_ENABLED=true`. Webhook intake and `npm run payments:sweep` still process late events when the webhook secret is present.

## Rate limits

Hosted Postgres uses a shared `RateLimit` table so multiple instances share the same counters (10 orders and 20 guest upload authorisations per IP per hour; login throttled). Isolated/local tests still use in-process memory. `npm run payments:sweep` and `/api/cron/maintenance` expire leftover rows.

## Hosted production (Vercel)

Set these in the Vercel project (never in git):

- `APP_URL` — public HTTPS origin
- `APP_PERSISTENCE=postgres`
- `DATABASE_URL` — hosted PostgreSQL
- `AUTH_SECRET` — at least 32 random characters
- `STAFF_ALLOWLIST` — provisioned staff emails
- `STORAGE_ADAPTER=blob`
- `BLOB_READ_WRITE_TOKEN`
- `CRON_SECRET` — at least 32 random characters (Vercel Cron sends `Authorization: Bearer CRON_SECRET`)
- `SNIPPE_ENABLED=false` until a separately authorised live payment test

Apply migrations with the Vercel build command (`prisma migrate deploy`). Provision staff after the first deploy. Register Snippe webhook `{APP_URL}/api/webhooks/snippe` when you are ready to receive events; leave initiation off.

Non-Vercel hosts must set `APP_REQUIRE_HOSTED=true` so isolated adapters cannot boot.

## Node

Baseline is Node.js 22 LTS. Local Next.js runs on port 3000.
