# ChinaChapu

A single-page catalogue and guest product-request service, with a protected staff dashboard. No prices, payments, or customer accounts.

## Status

Application implementation is in progress on this branch. Local default persistence is the **isolated** adapter (`.data/`), which is not production-ready. PostgreSQL, S3-compatible storage, staff allowlist credentials, and a shared rate-limit store must be configured before launch.

## Documentation

- [Product requirements](docs/PRODUCT.md)
- [Catalogue and image brief](docs/CATALOGUE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data model and API](docs/DATA-AND-API.md)
- [Development and operations](docs/DEVELOPMENT.md)
- [Implementation setup](docs/SETUP.md)
- [Operations runbook](docs/OPERATIONS.md)
- [Acceptance plan](docs/ACCEPTANCE.md)
- [Cursor handoff](docs/CURSOR-HANDOFF.md)
- [Contributing](CONTRIBUTING.md)

## Local setup

Planned runtime baseline: Node.js 22 LTS and npm. Next.js listens on port 3000. XAMPP/Apache does not run this application.

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

The original BloomShop README identifies Bloomtpl as author, ThemeWagon as distributor, and states MIT licensing. Preserve [the original README](docs/TEMPLATE-README.md). Verify the upstream license and replace seed illustrations with owner-approved photography before release.
