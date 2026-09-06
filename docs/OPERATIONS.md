# Operations runbook

This application is implemented but **not production-ready** while `APP_PERSISTENCE=isolated` or `STORAGE_ADAPTER=isolated`. Isolated adapters write under `.data/` for local development and tests only.

## Configuration

Copy `.env.example` to `.env`. Never commit secrets. Required production values:

- PostgreSQL `DATABASE_URL`
- `APP_URL` (canonical HTTPS origin)
- `AUTH_SECRET` (long random)
- `STAFF_ALLOWLIST` plus provisioned staff identities
- S3-compatible storage credentials and separate public/private buckets
- Shared rate-limit store before running more than one app instance

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
```

`npm run db:migrate` applies Prisma migrations when `APP_PERSISTENCE=postgres`. Isolated mode does not use SQL migrations.

## Staff access

1. Add the staff email to `STAFF_ALLOWLIST`.
2. Run `npm run staff:provision`.
3. Sign in at `/admin/login`.
4. There is no public registration and no default password.

## Uploads

- Guest reference images are private.
- Unclaimed uploads expire after 24 hours; run `npm run db:cleanup` on a schedule.
- Define retention for submitted orders and photos with the owner before launch. Delete database rows and blobs together.

## Backups and rollback

- PostgreSQL: enable backups and test restore.
- Object storage: version or replicate both buckets.
- Application rollback: redeploy the previous Next.js build. Review migrations before applying destructive schema changes.

## Logging

Log request IDs, status codes, and timing. Do not log names, emails, phone numbers, notes, or signed URLs.

## Remaining launch work

- Provision hosted PostgreSQL, object storage, and TLS.
- Confirm catalogue photography rights and business contact copy.
- Approve privacy wording and retention periods.
- Replace process-local rate limits with a shared store.
- Run the full [acceptance plan](ACCEPTANCE.md) against production-like persistence.
