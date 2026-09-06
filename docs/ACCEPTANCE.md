# Acceptance and verification plan

These are implementation acceptance checks, not claims of passing tests. Use synthetic contact information and isolated test storage/database.

| ID | Scenario and expected outcome |
| --- | --- |
| C01 | Browse `/` on mobile/desktop; all required categories and images appear; filters/search work without leaving the page |
| C02 | Inspect cards, request list, legacy routes, metadata, and public JSON; no prices/currencies/fees/discounts/payment controls |
| C03 | Submit a catalogue item with quantity and required contacts, all optional fields blank; one durable request created without account |
| C04 | Submit a custom-only item with name/quantity and no photo/description; accepted even with empty catalogue |
| C05 | Submit mixed catalogue/custom items with distinct notes/photos; admin sees exact line quantities and associations |
| C06 | Edit/remove lines and images; distinct product variants remain separate; totals count units only |
| C07 | Blank/zero/fractional/negative/over-limit quantity, missing contacts, invalid email/phone, long notes, zero/21 lines; client and direct API reject |
| C08 | Double-click/retry after timeout with same key; exactly one order; changed payload/same key conflicts |
| C09 | Force database/network failure; no false success, partial order, or lost form; retry succeeds |
| C10 | Archive product after adding to request; submit rejects unavailable line with recovery guidance |
| U01 | Valid JPEG/PNG/WebP preview/upload/remove/replace; optional failures can be removed to continue |
| U02 | Oversized, spoofed MIME, SVG, corrupt or excessive-dimension images rejected before claim |
| U03 | Another draft's upload ID, expired/unready/already claimed ID rejected; private media cannot be read anonymously |
| U04 | Unclaimed uploads cleaned after 24 hours; claimed uploads survive cleanup; failed transactions do not leak permanent orphans |
| A01 | Anonymous/nonstaff requests to every admin page/API/image path denied; no contacts in HTML/payload/cache |
| A02 | Staff login/logout/expiration function; mutation origin checks and throttling work |
| A03 | Orders list/search/filter/pagination and full details match persisted request, including contacts/photos |
| A04 | Dashboard counts match seeded status fixtures; no revenue; date timezone labelled |
| A05 | Valid status change records actor/time; invalid transitions rejected; stale version conflicts |
| A06 | Create draft, upload, publish, edit, archive/unarchive product; public catalogue updates and historic order snapshots remain intact |
| A07 | Publishing without valid image/alt/category/name rejected; customer reference image cannot be claimed as staff catalogue image |
| Q01 | Keyboard-only and narrow 360px layout: controls usable, no horizontal overflow, focus/error announcements correct |
| Q02 | Empty catalogue, no search matches, failed image, empty request, API/loading errors have clear states |
| Q03 | Restart app and reconnect browser; submitted order and images persist; contacts absent from localStorage/logs/URLs |
| Q04 | Rate-limit boundaries return 429 with retry guidance; server inputs ignore no validation via direct API |

Automate schema boundaries and status transitions as unit tests; transactions, idempotency, ownership, authorization, and optimistic updates as integration tests with real test persistence; guest-to-admin flow and mobile/accessibility checks as browser tests. Add regression checks for monetary UI and public payloads. Verify two simultaneous submissions/updates, not only sequential retries.

Release evidence must record tool versions, commands/results, skipped checks with reasons, migration/seed results, and manual browser checks. Run lint separately from build, typecheck, test suites, and production build after scripts are added. Never label this documentation plan as a completed test suite.
