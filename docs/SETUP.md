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

- **Production adapter:** S3-compatible buckets (`STORAGE_ADAPTER=s3`) with separate public catalogue and private reference buckets.
- **Isolated adapter:** local files under `.data/storage/` (`STORAGE_ADAPTER=isolated`). Not a production store.

Guest uploads are authorised into quarantine, validated, re-encoded, then claimed only inside the order transaction.

## Rate limits

In-process counters (10 orders and 20 guest upload authorisations per IP per hour; login throttled). Replace with shared store (for example Redis) before multi-instance production. Configure `RATE_LIMIT_STORE=memory` today.

## Node

Proposed baseline is Node.js 22 LTS. Next.js runs on port 3000.
