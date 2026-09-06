# Product requirements

## Scope

ChinaChapu is a single-page catalogue for guest product requests. Use Next.js for frontend and backend. This phase provides documentation for Cursor; the imported template is not the finished product.

Owner requirements: shoes, purses, clothes, perfumes, and additional suitable categories; product pictures; quantities; optional descriptions and reference pictures; custom products; guest name, email, and phone; staff dashboard for orders, customer details, and product creation/uploads. Never display prices. No customer account creation.

Proposed implementation defaults: English UI; all three contact fields required; quantity defaults to 1; one optional reference picture per item; no address; manual staff follow-up; seeded categories. These are planning decisions rather than additional owner instructions.

## Customer flow on `/`

1. See branding, a short request-process explanation, search, category filters (All by default), and image-led active product cards.
2. Choose a product, quantity, and optional item notes/photo; add to an inline request list or drawer without navigating away.
3. “Request something else” accepts a required product name and quantity, optional category, description, and picture. This works without a catalogue selection and even with an empty catalogue.
4. Review mixed catalogue/custom items, edit quantities and notes, replace/remove photos, and remove items. Keep lines with different notes/photos separate even for the same product.
5. Enter name, email, and phone; see a short privacy notice; submit without login. Require at least one item.
6. Show a reference and “Request received” only after durable server success. Explain that staff will contact the customer to discuss availability and arrangements. No payment or availability guarantee. Clear after success; retain form state in memory on failure and permit retry.

No separate customer checkout or required product-detail page. No prices, totals of money, currency, tax, shipping fees, discounts, sale badges, monetary metadata, or payment controls. Summary shows items and units only. Admin may use separate routes.

## Validation defaults

| Field | Rule |
| --- | --- |
| Name | Required, trimmed, Unicode supported, 2–100 characters |
| Email | Required, trimmed, valid format, at most 254 characters |
| Phone | Required, 7–15 digits after normalising spaces/punctuation; optional leading +; no forced country code |
| Quantity | Integer 1–999, default 1; reject blank/fractional/negative values |
| Custom item name | Required, trimmed, 2–150 characters |
| Item description | Optional, at most 2,000 characters |
| Reference image | Optional, one JPEG/PNG/WebP per item, at most 5 MiB |
| Request | 1–20 lines |

Use matching client/server validation. Optional blanks must not block submission. Explain image limits before selection. Failed optional uploads may be retried or explicitly removed before continuing.

## Admin

Staff login only; no public registration. `/admin` shows all-time total/new/in-progress/completed orders, active products, and recent requests. In-progress means contacted or sourcing. No revenue metrics.

`/admin/orders`: paginated newest-first list, status/date filters, search by reference/name/email/phone. Detail page shows contacts, timestamps, item snapshots, quantities, descriptions, private reference images, internal notes, and status history. Customer details must never be publicly accessible.

Statuses: new → contacted → sourcing → completed; any nonterminal status may become cancelled. Completed/cancelled are terminal in MVP. Record actor/time for changes; reject conflicting concurrent updates.

`/admin/products`: list/search, create/edit, upload/replace picture, category selection, draft/publish, archive/unarchive. Name/category required; valid image and alt text required to publish; description optional. Archive rather than delete referenced products. Seed categories; category management UI is deferred.

## Experience and exclusions

Mobile-first, keyboard-operable controls, visible request count, labelled inputs, accessible error/success announcements, readable contrast, meaningful alt text, and loading/empty/no-results/unavailable/error states. Remove unverified template delivery, return, and support promises.

Deferred: payments, pricing/quotations, customer accounts, public order lookup, inventory accounting, shipping, coupons, reviews, notifications, bulk exports, and multiple staff roles.
