# Cursor implementation handoff

## Starting point

Read [Product](PRODUCT.md), [Catalogue](CATALOGUE.md), [Architecture](ARCHITECTURE.md), [Data/API](DATA-AND-API.md), [Development](DEVELOPMENT.md), and [Acceptance](ACCEPTANCE.md). This branch imports the unchanged template and documents intended behavior. Application implementation has not started. Do not mistake template behavior for requirements.

## Template map

| Existing area | Required work |
| --- | --- |
| `app/page.tsx`, `components/home/*` | Replace sneaker-only content with categorized single-page catalogue and request flow |
| `types/product.ts`, `data/products.json` | Remove money-based model; migrate to persistent catalogue with seed image manifest |
| `context/CartContext.tsx` | Replace price cart with typed mixed request lines, notes/images, bounded quantities, safe state handling |
| `components/cart/*` | Replace subtotal/tax/shipping/payment UI with request review |
| `app/cart`, `app/product/[productId]`, `app/contact` | Consolidate public journey and implement legacy route behavior in architecture |
| `components/layout/*`, `app/layout.tsx` | ChinaChapu branding, in-page navigation, metadata, remove unsupported claims |
| `next.config.ts` | Configure selected media host narrowly |
| `package.json`, `eslint.config.mjs` | Fix lint/version mismatch and add verification scripts |
| `.github/workflows/action.yml` | Preserve/review release workflow; add separate CI, avoid automatic deployment assumptions |

## Ordered milestones and suggested small commits

1. **Tooling baseline:** install/audit, align dependencies/lint, add typecheck and CI; record initial failures. Choose auth/provider adapters and document setup. Gate: lint/typecheck/build can run reliably.
2. **Persistence:** schema/migrations, repeatable categories/products seed, server-only services, staff auth/provisioning, validated media storage. Separate schema/auth/upload commits. Gate: authorization, ownership, and data constraints tested.
3. **Public catalogue:** required categories plus proposed additions, rights-cleared product images/manifest, filters/search, responsive layout, remove all monetary UI/data and legacy paths. Gate: C01–C02, Q01–Q02.
4. **Guest requests:** mixed/custom lines, quantities, optional fields/uploads, contact form, transactional submission, idempotency, confirmation and retries. Separate UI and server commits. Gate: C03–C10, U01–U04.
5. **Staff dashboard:** authenticated counts, order list/details/search/status/notes, product CRUD through drafts/publishing/archival. Gate: A01–A07.
6. **Release preparation:** full acceptance suite, persistence/restart check, upload cleanup, operations runbook and configuration examples, owner content/privacy review. Gate: Q03–Q04 and all earlier checks.

Do not add payments or customer login. No service-specific product is selected by this documentation. Resolve hosting/database/storage/auth credentials before integrating those services; UI and contract work can proceed with isolated test adapters. Confirm operational retention, business contact copy, product availability, and final assets before launch. Staff follow-up is manual; notification integrations are deferred.

## Ready-to-use implementation prompt

> Implement ChinaChapu from the documentation in this repository. Use Next.js for frontend and backend. Build one public page for browsing categories and submitting catalogue or custom product requests without prices or customer accounts. Require name, email, phone, and quantities; descriptions and reference images are optional. Add a protected admin dashboard for orders, customer details, status tracking, and product/image management. Follow the documented contracts, security boundaries, and acceptance plan. Start with the tooling baseline, implement in small commits on a new branch, preserve template attribution, and report actual checks and remaining configuration. Do not claim placeholder persistence or unfinished features are production-ready.
