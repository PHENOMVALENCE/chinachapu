# Development and operations

## Current baseline

Implemented application: Next.js 16, React 19, TypeScript, Tailwind 4. `package-lock.json` controls exact installation. Prisma + PostgreSQL is the production store; isolated file persistence under `.data/` is local/test only.

```sh
copy .env.example .env
npm ci
npm run db:seed
npm run staff:provision -- owner@example.com "choose-a-strong-password"
npm run dev
```

Use Node.js 22 LTS. Run Next.js on port 3000; XAMPP is not needed. Production on Vercel uses `prisma migrate deploy` during build, then the Next.js server. Do not use static export or GitHub Pages.

Scripts that exist: `lint` (ESLint CLI + `eslint-config-next` 16), `typecheck`, `test` (Vitest), `build`, Prisma migrate/seed, `staff:provision`, `db:cleanup`, `payments:sweep`. CI is `.github/workflows/ci.yml` and does not deploy. Adapter choices: [SETUP.md](SETUP.md). Runbook: [OPERATIONS.md](OPERATIONS.md).

## Environment contract

Documented in `.env.example`. Server-only; no credentials in `NEXT_PUBLIC_*`. Hosted runtimes (`VERCEL` or `APP_REQUIRE_HOSTED=true`) validate required values at startup.

| Variable | Purpose |
| --- | --- |
| `APP_URL` | Canonical origin for same-origin checks. HTTPS required when hosted. |
| `APP_PERSISTENCE` | `postgres` (production) or `isolated` (local/test) |
| `DATABASE_URL` | PostgreSQL connection when persistence is postgres |
| `AUTH_SECRET` | Staff/pay cookie signing secret, 32+ characters |
| `STAFF_ALLOWLIST` | Comma-separated staff emails |
| `STORAGE_ADAPTER` | `blob` (Vercel production), `isolated` (local/test). `s3` is not implemented. |
| `BLOB_READ_WRITE_TOKEN` | Required when `STORAGE_ADAPTER=blob` |
| `CRON_SECRET` | Bearer secret for `/api/cron/maintenance`, 32+ characters when hosted |
| `APP_REQUIRE_HOSTED` | `true` on non-Vercel production hosts |
| `SNIPPE_ENABLED` | Leave `false` until live collection is authorised |
| `SNIPPE_API_KEY` / `SNIPPE_WEBHOOK_SECRET` | Server-only Snippe credentials |
| `SNIPPE_API_BASE_URL` / `SNIPPE_WEBHOOK_URL` | Official API host and public webhook URL |

Postgres persistence uses the `RateLimit` table for shared counters. Isolated mode uses in-process memory.

## Verification

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

CI runs those gates with isolated persistence. A production-like check also needs hosted Postgres, Blob, and the [acceptance plan](ACCEPTANCE.md).

## Launch checklist (still owner / hosting)

- Create Vercel project, hosted PostgreSQL, Blob store, and TLS hostname. Record credentials only in the host secret store.
- Provision owner staff (`STAFF_ALLOWLIST` + `npm run staff:provision`). No default admin password.
- Confirm catalogue licenses, branding, contacts, and privacy wording.
- Approve retention/deletion for orders and photos. Daily cron already expires unclaimed uploads.
- Enable database backups and test restore. Log request IDs/status/timing, not personal fields or signed URLs.
- Run acceptance against production persistence. Keep `SNIPPE_ENABLED=false` until [SNIPPE-PROVIDER-CONTRACT.md](SNIPPE-PROVIDER-CONTRACT.md) gaps are closed and a real-money test is separately authorised.
