# ChinaChapu

A planned single-page catalogue and guest product-request service, with a protected staff dashboard. No prices, payments, or customer accounts.

## Status

Documentation and template baseline only. The imported BloomShop template still contains prices and separate product/cart pages. Orders, uploads, persistence, and admin authentication are not implemented. Cursor will implement the specification.

## Documentation

- [Product requirements](docs/PRODUCT.md)
- [Catalogue and image brief](docs/CATALOGUE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data model and API](docs/DATA-AND-API.md)
- [Development and operations](docs/DEVELOPMENT.md)
- [Acceptance plan](docs/ACCEPTANCE.md)
- [Cursor handoff](docs/CURSOR-HANDOFF.md)
- [Contributing](CONTRIBUTING.md)

## Existing template setup

Planned runtime baseline: Node.js 22 LTS and npm. Verify compatibility when aligning dependencies.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. XAMPP/Apache does not run this Node.js application. See the development guide for tooling issues. Installation/build were not tested in this documentation phase.

## Attribution

The original BloomShop README identifies Bloomtpl as author, ThemeWagon as distributor, and states MIT licensing. Preserve [the original README](docs/TEMPLATE-README.md). No standalone upstream license was included; verify the upstream license and image rights before release. This documentation grants no additional rights.
