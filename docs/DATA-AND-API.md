# Data model and API contract

Implemented Prisma schema with additive migrations and shared Zod validation. Catalogue, order, and product tables have no price, currency, subtotal, or payment columns. Quote and payment tables are Phase 2 only and stay off the public catalogue.

## Entities

| Entity | Fields and invariants |
| --- | --- |
| Category | UUID id, unique slug, name, sortOrder; seeded |
| Product | UUID id, unique slug, name (2–150), categoryId FK, optional description (2,000 max), imageAssetId FK, altText, state draft/active/archived, version, UTC timestamps; active requires image/alt |
| Order | UUID id, unique opaque reference, name/email/phone, status default new, unique idempotencyKey, requestHash, version, UTC createdAt/updatedAt |
| OrderItem | UUID id, orderId FK, kind catalogue/custom, nullable productId FK, immutable name/category snapshot, quantity 1–999, optional description; catalogue requires valid active product at creation; custom requires supplied name |
| Upload | UUID id, unique storageKey, purpose reference/catalogue, draft-owner hash or staff owner, MIME, bytes, dimensions, state pending/ready/claimed, expiry, nullable orderItemId; reference belongs to at most one item |
| OrderEvent | UUID id, orderId FK, old/new status, staffId, timestamp; append-only |
| StaffNote | UUID id, orderId FK, staffId, text (1–2,000), timestamp; private |
| StaffUser | UUID id, unique email, password hash; login also requires `STAFF_ALLOWLIST` |
| RateLimit | Hashed key, count, resetAt; used when `APP_PERSISTENCE=postgres` |
| Quote | orderId, revision, integer TZS total, explanation, draft/published/superseded/revoked, expiresAt; unique order/revision |
| PaymentAccess | quoteId, unique tokenHash, expiresAt, revokedAt; plaintext token never stored |
| PaymentAttempt | quote/order FKs, immutable amount/currency, local status, unique provider refs when known |
| WebhookInbox | unique eventId, payload hash, processing status |
| PaymentLedger | unique provider payment ref; immutable completion evidence |
| PaymentAudit | actor, action, optional order/quote/attempt ids |

Index orders by createdAt and status/createdAt; index foreign keys and implement bounded contact/reference search. Contact fields are not unique: the same person can place multiple orders. Keep snapshots after product changes or archival. Never cascade product deletion into orders. Use database constraints for quantities, uniqueness, and ownership where possible.

## Public endpoints

| Method/path | Contract |
| --- | --- |
| GET `/api/products?category=&q=&cursor=` | Active products only: id/name/category/description/image/alt; bounded page of 24, max 100 |
| GET `/api/categories` | Seeded category id/slug/name/order |
| POST `/api/uploads` | Draft-scoped upload authorisation: filename/type/size; return opaque ID and short-lived upload instructions; limited guest reference purpose only |
| POST `/api/uploads/[id]/complete` | Verify owner and stored file; validate/re-encode; mark ready or reject |
| POST `/api/orders` | Validated guest request; durable transactional creation; reference-only response |

No public order list, contact lookup, or order detail by reference. Catalogue images may be served from `GET /api/media/public?key=` for `catalogue/*` keys only. Reference images are staff-only via `GET /api/admin/media`.

Example `POST /api/orders` body (UUID values illustrative):

```json
{
  "idempotencyKey": "client-generated-random-uuid",
  "customer": { "name": "Example Customer", "email": "customer@example.com", "phone": "+255700000000" },
  "items": [
    { "kind": "catalogue", "productId": "product-uuid", "quantity": 2, "description": "Size 40, black" },
    { "kind": "custom", "name": "Travel bag", "quantity": 1, "uploadId": "ready-upload-uuid" }
  ]
}
```

Optional custom `categoryId`, item `description`, and `uploadId` may be absent. Reject catalogue name overrides and unexpected monetary fields. Re-read active product names/categories on the server. Validate all lines and upload ownership before committing; never partially accept an order. Return `201 { "reference": "opaque-reference", "status": "new" }`. An identical retry returns `200` with the original creation result, without contacts or current private order state. Retain keys with orders. Different payload under the same key returns 409. Keep the same key after a network failure; generate a new one for a new request.

## Admin endpoints

All require server-verified staff session. Paginate lists; max page size 100. Private/no-store responses.

| Method/path | Purpose |
| --- | --- |
| GET `/api/admin/summary` | Counts defined in product spec and recent requests |
| GET `/api/admin/orders` | Filters: status/from/to/q/cursor; all dates validated |
| GET `/api/admin/orders/[id]` | Contacts, snapshots, events, notes; authorised image links |
| PATCH `/api/admin/orders/[id]` | `{status, version}`; enforce transition, atomically append event |
| POST `/api/admin/orders/[id]/notes` | `{text}`; derive actor from session |
| GET/POST `/api/admin/products` | List or create draft product |
| PATCH `/api/admin/products/[id]` | Validated fields/state and version; publish/archival rules |
| POST `/api/admin/uploads` | Staff-scoped catalogue upload authorisation |
| POST `/api/admin/uploads/[id]/complete` | Validate and finalise staff catalogue image |
| POST `/api/admin/orders/[id]/quotes` | Create/publish an immutable TZS quote revision |
| POST `/api/admin/quotes/[id]/access` | Issue or rotate a private payment-access token (raw token returned once) |
| POST `/api/admin/quotes/[id]/revoke` | Revoke access after outstanding-attempt checks |
| POST `/api/admin/payments/[id]/reconcile` | Audited provider lookup |
| GET `/pay/[token]` | Exchange token for scoped cookie; redirect to `/pay` |
| POST `/api/payments/session` | Cookie-scoped hosted session create/resume; no client amount |
| GET `/api/payments/status` | Cookie-scoped local payment state |
| POST `/api/webhooks/snippe` | Raw-body HMAC; durable inbox |

No hard-delete route in MVP. Auth is `POST /api/auth/login` and `POST /api/auth/logout`. Private media routes require staff and are no-store. Financial rows use Restrict deletes so order deletion cannot cascade quotes, attempts, or ledger entries.

## Error envelope

`{ "error": { "code": "VALIDATION_ERROR", "message": "Check the highlighted fields.", "fields": { "items.0.quantity": "Enter a whole number from 1 to 999." } } }`

Use 400 malformed request, 401 missing session, 403 nonstaff/forbidden, 404 missing resource, 409 version/idempotency conflict or unavailable product, 413 oversized file/body, 415 unsupported image, 422 invalid fields, 429 rate limit with retry guidance, 500 generic failure. Never return database errors, secrets, other customers' upload existence, or stack traces. UI maps errors to fields and preserves input; an unavailable product requires removal/replacement before resubmission.
