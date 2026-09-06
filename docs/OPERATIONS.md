# Operations runbook

Isolated adapters (`APP_PERSISTENCE=isolated` or `STORAGE_ADAPTER=isolated`) write under `.data/` and are for local development and tests only. Hosted boot (`VERCEL` or `APP_REQUIRE_HOSTED=true`) refuses those adapters.

## Configuration

Copy `.env.example` to `.env`. Never commit secrets. Required production values:

- PostgreSQL `DATABASE_URL`
- `APP_URL` (canonical HTTPS origin)
- `AUTH_SECRET` (long random, 32+ characters)
- `STAFF_ALLOWLIST` plus provisioned staff identities
- `STORAGE_ADAPTER=blob` and `BLOB_READ_WRITE_TOKEN` on Vercel. The S3 adapter is not implemented.
- `CRON_SECRET` (32+ characters)
- Shared rate-limit rows come from Postgres when persistence is `postgres`

See [SETUP.md](SETUP.md) for adapter choices.

## Commands that exist today

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run db:seed
npm run staff:provision -- staff@example.com 'choose-a-strong-password'
npm run db:cleanup
npm run payments:sweep
```

`npm run db:migrate` and Vercel `buildCommand` apply Prisma migrations when `APP_PERSISTENCE=postgres`. Isolated mode does not use SQL migrations.

## Staff access

1. Add the staff email to `STAFF_ALLOWLIST`.
2. Run `npm run staff:provision`.
3. Sign in at `/admin/login`.
4. There is no public registration and no default password.

## Uploads

- Guest reference images are private.
- Unclaimed uploads expire after 24 hours; `/api/cron/maintenance` (03:00 UTC on Vercel) or `npm run db:cleanup` removes them.
- Images are limited to 4 MiB so they fit hosted request bodies.
- Define retention for submitted orders and photos with the owner before launch. Delete database rows and blobs together.

## Backups and rollback

- PostgreSQL: enable backups and test restore.
- Object storage: version or replicate Blob/S3 prefixes.
- Application rollback: redeploy the previous Next.js build. Review migrations before applying destructive schema changes.

## Logging

Log request IDs (`x-request-id`), status codes, and timing. Do not log names, emails, phone numbers, notes, or signed URLs.

## Health

`GET /api/health` returns process configuration (not secrets) and pings Postgres when persistence is `postgres`.

## Snippe payments

- Feature flag: `SNIPPE_ENABLED`. Leave false until provider-contract gaps in [SNIPPE-PROVIDER-CONTRACT.md](SNIPPE-PROVIDER-CONTRACT.md) are closed and a real-money test is separately authorised.
- Register webhook `https://<production-host>/api/webhooks/snippe`. Do not paste secrets into tickets or git.
- Daily maintenance cron sweeps inbox and unknown attempts when the webhook secret is present.
- Rollback: set `SNIPPE_ENABLED=false`. Do not drop ledger or inbox tables. Keep sweeping late webhooks.
- Order deletion must not cascade into quotes, attempts, or ledger rows (Restrict).

## Remaining launch work (owner / hosting)

- Create the Vercel project, hosted PostgreSQL, Blob store, and TLS hostname.
- Confirm catalogue photography rights and business contact copy.
- Approve privacy wording and retention periods.
- Run the full [acceptance plan](ACCEPTANCE.md) against production persistence.
- Do not enable live Snippe charges until the outstanding contract checks are closed.
