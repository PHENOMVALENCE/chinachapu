# Cursor implementation handoff

## Starting point

Phase 1 (catalogue, guest requests, staff dashboard) and Phase 2 (disabled quote-first Snippe collection) are implemented. Read the current docs before changing behavior; do not treat the imported BloomShop template as the product.

Remaining work is hosting, owner content, and live payment enablement — not a restart from the template.

## What is implemented

| Area | Current behavior |
| --- | --- |
| Public `/` | Categorized catalogue, search/filters, mixed request lines, contact submit |
| Persistence | Prisma/PostgreSQL or isolated `.data/` store |
| Auth | Signed HttpOnly JWTs (`jose`), staff allowlist, `staff:provision` |
| Media | Isolated files locally; Vercel Blob when hosted; public catalogue via `/api/media/public` |
| Admin | Orders, notes, status, product CRUD, quote publish/revoke/reconcile |
| Payments | Quote-first private `/pay` links; hosted Snippe sessions; webhook inbox. Initiation off by default |
| Tooling | ESLint CLI, typecheck, Vitest, CI, production build |

## Do not redo

- Do not restore monetary product types or public catalogue prices.
- Do not enable `SNIPPE_ENABLED` without documented provider-contract evidence and explicit charge authorisation.
- Do not deploy isolated adapters. Hosted boot refuses them.
- Do not implement S3 unless you finish the adapter; the setting currently throws.

## Remaining owner / agent work

1. Provision Vercel, Postgres, Blob, TLS, and env values from [SETUP.md](SETUP.md).
2. Replace or confirm seed photography rights ([PRODUCT-IMAGE-SOURCES.md](PRODUCT-IMAGE-SOURCES.md)).
3. Approve privacy/retention copy.
4. Run [ACCEPTANCE.md](ACCEPTANCE.md) against hosted persistence.
5. Close [SNIPPE-PROVIDER-CONTRACT.md](SNIPPE-PROVIDER-CONTRACT.md) gaps before any live charge.

## Ready-to-use follow-on prompt

> Continue from the implemented ChinaChapu application. Do not restart from the shop template. Public catalogue stays price-free. Payments stay disabled unless I explicitly authorise a live Snippe test. Prefer hosted Postgres + Vercel Blob for production. Update docs when behavior changes.
