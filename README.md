# ChinaChapu

A single-page catalogue and guest product-request service, with a protected staff dashboard. The public catalogue has no product prices and no customer accounts. Staff can later share a private quote-first payment link; live Snippe initiation stays **disabled** until separately authorised.

## Status

Phase 1 (catalogue, guest requests, staff dashboard) and Phase 2 (quote-first Snippe collection) are implemented. Local default persistence is the **isolated** adapter (`.data/`), which must not be deployed.

Production path: Vercel + PostgreSQL + Vercel Blob, with hosted boot refusing isolated adapters. Hosting credentials, TLS, and staff provisioning are still owner/hosting work. `SNIPPE_ENABLED` remains `false`.

## Documentation

- [Product requirements](docs/PRODUCT.md)
- [Catalogue and image brief](docs/CATALOGUE.md)
- [Product image sources](docs/PRODUCT-IMAGE-SOURCES.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data model and API](docs/DATA-AND-API.md)
- [Development](docs/DEVELOPMENT.md)
- [Implementation setup](docs/SETUP.md)
- [Operations runbook](docs/OPERATIONS.md)
- [Acceptance plan](docs/ACCEPTANCE.md)
- [Snippe integration](docs/SNIPPE-INTEGRATION.md)
- [Snippe provider contract](docs/SNIPPE-PROVIDER-CONTRACT.md)
- [Cursor handoff](docs/CURSOR-HANDOFF.md)
- [Contributing](CONTRIBUTING.md)

## Local setup

Runtime baseline: Node.js 22 LTS and npm. Next.js listens on port 3000. XAMPP/Apache does not run this application.

```sh
copy .env.example .env
npm ci
npm run db:seed
npm run staff:provision -- owner@example.com "choose-a-strong-password"
npm run dev
```

Add the same email to `STAFF_ALLOWLIST` in `.env`. Open http://localhost:3000 and `/admin/login`.

Verification:

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

## Attribution

The original BloomShop README identifies Bloomtpl as author, ThemeWagon as distributor, and states MIT licensing. Preserve [the original README](docs/TEMPLATE-README.md). Replace seed photography with owner-approved assets before release if required; current provenance is in [PRODUCT-IMAGE-SOURCES.md](docs/PRODUCT-IMAGE-SOURCES.md).
