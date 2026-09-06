# Architecture and decisions

Status: proposed implementation design, not installed infrastructure.

## Application boundaries

One Next.js App Router application, TypeScript, existing Tailwind/components. Server Components read the catalogue through a server-only data layer. Client components own filters, request editing, previews, and guest form interactions. Route Handlers implement the contract in [Data and API](DATA-AND-API.md). Server-rendered admin pages call the same service layer directly. Keep credentials/database/storage code server-only.

Use a Node.js runtime with a persistent PostgreSQL database and S3-compatible object storage. Proposed ORM: Prisma. Use an established Next.js-compatible session/auth library with provisioned staff identities; choose provider/library in the first implementation milestone and document it. No customer identity system. Providers, hosting, and credentials are unresolved; no service provisioning is part of this PR.

These provider-neutral choices support transactional orders and durable uploads. Do not use browser storage, static JSON, local runtime files, or an in-memory array as production persistence. Existing `data/products.json` is template data only.

## Routes and modules

| Path/module | Responsibility |
| --- | --- |
| `/` | Complete public browse/custom request/review/contact/confirmation flow |
| `/admin/login` | Staff authentication |
| `/admin` | Protected operational summary |
| `/admin/orders`, `/admin/orders/[id]` | Protected list and detail |
| `/admin/products`, `/admin/products/new`, `/admin/products/[id]` | Product management |
| `app/api/**/route.ts` | Validated HTTP boundaries |
| `lib/server/` | Auth checks, order/product services, DB and storage adapters |
| `lib/validation/` | Shared input schemas and limits |
| `components/request/` | Request editor and guest form |
| `prisma/` | Proposed schema, migrations, non-sensitive seed data |

Redirect old `/cart` to `/#request`, old product URLs to `/?product=<id>` with inline selection when active (otherwise show unavailable), and `/contact` to `/#contact`. Resolve any other legacy links during implementation. Public URLs must not contain personal information.

## Security and reliability

Check staff authentication and authorization in every admin read/mutation, including attachment delivery and dashboard aggregation. A hidden navigation link or protected layout is insufficient. Use secure HttpOnly session cookies, expiration/logout, same-origin mutation protection, login throttling, and an explicit staff allowlist. Never trust a client role field.

Validate all inputs server-side, reject unexpected fields, escape rendered notes, avoid raw HTML, parameterise database access, and never accept client product snapshots as authoritative. Public catalogue DTOs contain only active product fields, no private customer data or monetary fields. Mark personal responses private/no-store; do not cache them in shared caches.

Bound public upload/order traffic with shared rate limiting (initial defaults: 10 orders and 20 upload authorisations per IP per hour, tunable). Use request-size limits and abuse monitoring without logging form contents. Do not persist contact information in localStorage. If retaining catalogue-only drafts, version the format, safely parse it, and remove legacy price-bearing carts.

Create orders/items/attachment claims in one transaction. A unique idempotency key prevents double submissions; changed payload with the same key conflicts. Use optimistic versions on admin changes. Store UTC timestamps and render staff dates in Africa/Dar_es_Salaam with labelled timezone.

## Images

Separate public catalogue media from private reference media. Give guest uploads a short-lived draft ownership token in an HttpOnly cookie; scope opaque upload IDs to that draft. Validate file signatures and successful decoding, allow JPEG/PNG/WebP only, max 5 MiB and 20 megapixels; reject SVG/executables regardless of extension. Strip metadata and re-encode. Bound processing resources. Generate random keys, never use submitted filenames as storage paths.

Use short-lived signed upload authorisation into quarantine; finalisation verifies stored size/type/content and produces an upload ID. Only finalised, unclaimed IDs from the submitting draft can attach to an order. Staff receive short-lived signed read URLs after authorization. Public product publishing uses separately validated staff uploads. Do not proxy arbitrary customer URLs.

Expire upload authorisations after 10 minutes; remove unclaimed uploads after 24 hours via a scheduled cleanup. Claim files only in the order transaction; recover/clean orphaned blobs after failure. Define approved retention/deletion periods for submitted orders and files before launch and delete both together under an audited staff process.

## Sources

Framework guidance checked during documentation preparation: [Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers), [authentication and authorization](https://nextjs.org/docs/app/guides/authentication), [backend for frontend](https://nextjs.org/docs/app/guides/backend-for-frontend). These support the Next.js boundaries; provider and operational choices above are project proposals.
