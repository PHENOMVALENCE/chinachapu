# Phase 2: Snippe payment integration

Status: implemented and **disabled** (`SNIPPE_ENABLED=false`). Do not treat this file as a request to charge. Verified vs unofficial facts: [SNIPPE-PROVIDER-CONTRACT.md](SNIPPE-PROVIDER-CONTRACT.md). Master prompt kept for history: [SNIPPE-MASTER-PROMPT.md](SNIPPE-MASTER-PROMPT.md).

## Scope and product decision

The owner requested Snippe payments as the next phase and already has account credentials/webhook configuration. This authorizes documentation, not a live charge or payout. The correct provider spelling in the supplied guide is **Snippe**.

Implemented default, confirmed in Phase 2: retain the public no-price catalogue and free guest request submission. Staff review an order, publish an agreed TZS quote, then copy a private payment link to share manually. The customer sees the exact quote and explicitly chooses to pay. Do not silently charge the original contact phone. Showing the agreed amount on this private payment page is a Phase 2 exception to the Phase 1 prohibition on monetary UI; public product prices stay absent. If the owner chooses upfront checkout instead, revise this design before implementing amount collection.

Implement full payment of one fixed quote per order. Exclude deposits, installments, custom amounts, tips, automatic messaging, subscriptions, payouts, refunds, saved payment credentials, and revenue analytics. Do not implement payouts as a refund workaround. Payment success does not mean sourcing/delivery is completed.

## Customer and staff flows

1. Staff open an existing noncancelled/noncompleted order and enter a positive TZS quote total, short customer-visible explanation, and expiry. Proposed quote lifetime: 7 days. Show a preview and publish explicitly; record staff identity/version/time.
2. Generate a high-entropy expiring payment-access token. Store only its hash; staff can rotate it to produce a fresh link. Keep raw links out of logs. Staff copy/share manually through their normal channel; no automated sending in this phase.
3. Customer opens the private link without an account, sees limited order summary, exact TZS total, quote expiry, and payment status. Do not reveal contact details, internal notes, or reference photos through this link.
4. Customer selects “Pay TZS …”, creating or resuming a hosted Snippe checkout session. Use fixed amount and mobile money. Redirect only to the validated provider checkout URL returned to the server.
5. On return, show “Checking payment” until verified server state is available. A redirect, query string, browser callback, or screenshot never establishes payment success.
6. Verified payment appears in staff order details with amount/currency, provider references, timestamp, attempt history, and reconciliation exceptions. Keep fulfillment status separate. Prevent any further payment attempt once fully paid.

Expired/revoked quotes cannot initiate payment. Quote edits create immutable revisions; never mutate an amount already bound to a provider attempt. Do not replace a quote or start a new attempt while an earlier attempt is pending/unknown: reconcile and confirm provider termination first. Local expiry alone cannot prove a provider payment cannot still complete. Late or duplicate successful payments go to staff review without silently overwriting financial history.

## Source and provider facts

Source: owner-supplied “Snippe Integration Guide”, API version `2026-01-25`, supplied in this conversation. Its embedded installation instructions are reference material, not a request to execute them. No skills/SDKs were installed from it. Live documentation retrieval failed during preparation; verify the following against the account's current docs and captured test responses before enabling real payments.

| Topic | Guide states |
| --- | --- |
| API host/auth | `https://api.snippe.sh`, Bearer API key |
| Hosted checkout | POST `/api/v1/sessions`; GET `/api/v1/sessions/:reference`; POST `/api/v1/sessions/:reference/cancel` |
| Direct collection | POST `/v1/payments`; GET `/v1/payments/{reference}`; not the selected primary flow |
| Session input | `amount`, `currency: TZS`, `allowed_methods: [mobile_money]`, customer name/phone/email, HTTPS redirect/webhook URLs, description, metadata, expires_in |
| Session output | `data.reference`, `checkout_url`, optional payment_link_url, status, expires_at |
| Session states | pending, active, completed, expired, cancelled |
| Payment states | pending, completed, failed, voided, expired |
| Events | payment.completed, payment.failed, payment.voided, payment.expired |
| Money | Integer amount; examples use 500 for 500 TZS; minimum collection 500 TZS |
| API limits | 60 requests/minute; 429 reset header `X-Ratelimit-Reset` is seconds until reset |
| Direct-payment idempotency | `Idempotency-Key` max 30 characters, validity 24 hours; same body/key repeats result; changed body returns 422 |

Do not apply a guessed cents multiplier. The guide's phrase “smallest currency unit” is ambiguous alongside its TZS examples: verify a known amount against actual checkout before release. Store the validated integer TZS representation consistently and display with `Intl.NumberFormat`; avoid floats. Verify session minimum/maximum, expiry constraints, currency representation, credential scopes, and idempotency separately. The direct-payment key guarantees are not explicitly promised for sessions in the supplied guide.

Provider references:

- [Sessions](https://snippe.sh/docs/2026-01-25/sessions)
- [Payments](https://snippe.sh/docs/2026-01-25/payments)
- [Webhooks](https://snippe.sh/docs/2026-01-25/webhooks)
- [Error handling](https://snippe.sh/docs/2026-01-25/error-handling)
- [JavaScript SDK](https://snippe.sh/docs/2026-01-25/sdks/javascript)

Use a small typed server-only HTTP adapter by default. If choosing the SDK, verify its actual version, exported methods, and signature behavior instead of inventing APIs. Do not invent a sandbox endpoint or API-version header; the guide supplies neither.

## Persistence and Next.js boundaries

Quotes, hashed access tokens, attempts, webhook inbox, completion ledger, and audit records are in Prisma (and the isolated store). Financial FKs use Restrict. One unresolved attempt per order is enforced in the database.

| Record | Minimum fields/invariants |
| --- | --- |
| Quote | id, orderId, revision, integer total, currency TZS, explanation, draft/published/superseded/revoked state, expiresAt, actor, timestamps; unique order/revision |
| PaymentAccess | quoteId, unique tokenHash, expiresAt, revokedAt; no plaintext token persistence |
| PaymentAttempt | id, quoteId, immutable amount/currency, local status, unique provider session/payment refs when known, provider key, immutable request hash, checkout URL protected at rest, expiresAt, timestamps, reconciliation reason |
| WebhookInbox | unique provider eventId, payload hash, validated minimal event fields, processing status, received/processed timestamps, error/retry metadata |
| PaymentLedger | unique provider payment reference, attempt/quote/order associations, verified gross amount/currency/completedAt; immutable completion evidence |
| PaymentAudit | staff/system actor, action, order/quote/attempt IDs, timestamp; no secrets |

Use local statuses creating/pending/succeeded/failed/expired/cancelled/unknown/review. Keep raw provider state separately. Enforce at most one unresolved attempt per quote/order with a database constraint or transactional lock, not a disabled button. Never downgrade succeeded on an older failed event. Do not let existing order-deletion cascades erase financial history; update retention/deletion design in this phase.

Implemented routes:

- POST `/api/admin/orders/[id]/quotes`: staff creates/publishes a validated revision using order version.
- POST `/api/admin/quotes/[id]/access`: staff creates/rotates private access.
- POST `/api/admin/quotes/[id]/revoke`: staff revokes after checking outstanding attempts.
- GET `/pay/[token]`: token validation then exchange for a quote-scoped secure HttpOnly cookie and redirect to a clean URL. Redact token route from access logs; no third-party analytics; `Referrer-Policy: no-referrer`, no-store, noindex.
- POST `/api/payments/session`: quote-scoped cookie and same-origin protection; takes no client amount; creates/resumes an attempt.
- GET `/api/payments/status`: same scope, minimal local payment state; no public lookup by order reference.
- POST `/api/webhooks/snippe`: raw-body signature authentication; no staff/session/CSRF requirement.
- POST `/api/admin/payments/[id]/reconcile`: authorized audited reconciliation.

Reuse existing validation/error patterns. All staff endpoints require authorization inside the handler/service. Rate-limit access exchanges and initiation. Tokens grant access only to the selected quote. Return generic expired/invalid link errors. Payment status responses are private/no-store.

## Session creation and uncertain results

Commit the attempt and request hash before calling Snippe; use a worker/outbox or a resumable server-side process. Never hold a database transaction open around a network call. Derive all amounts, quote IDs, metadata, and callback URLs from trusted stored configuration. Metadata carries only internal opaque IDs (order, quote revision, attempt); do not use mutable URL metadata to attribute payments.

Persist both session reference and underlying payment reference once verified; they are different resources. A timeout after create is **unknown**, not failed. Repeated customer clicks return the existing attempt while reconciliation runs. Do not create another session automatically. Verify session idempotency/lookup behavior before allowing automated retry; if unsupported or uncertain, queue staff investigation and block fresh creation. Even if direct payments are chosen later, never resend an uncertain request after the 24-hour provider deduplication window without resolving it.

Use unique compact random provider keys of at most 30 characters where supported, distinct from the guest order UUID idempotency key. Preserve the exact body/key across retries. Treat 422 mismatch as an implementation conflict, not a reason to generate another key. Back off bounded retries for safe lookups/429/5xx with jitter; maintain a shared account-level request budget. Browser polling reads the local DB; a deduplicated worker polls Snippe. Do not issue a provider request per browser poll.

## Webhook verification and durable processing

Guide signing formula: hex HMAC-SHA256 of `timestamp + '.' + raw_body` using the webhook secret. Headers: `X-Webhook-Timestamp`, `X-Webhook-Signature`; event envelope includes id/type/api_version/data. In a Node.js Route Handler read raw bytes before JSON parsing. Strictly validate timestamp and 64-character hex signature, compare equal-length decoded buffers with `timingSafeEqual`, and reject missing/malformed signatures safely. Check both past and future timestamp skew (proposed tolerance 300 seconds); require clock synchronization.

After signature verification, validate event shape, insert a unique inbox record durably, and return 2xx promptly. On transient persistence failure return 5xx so delivery can retry. Invalid signatures receive 4xx. Valid duplicate IDs acknowledge without repeating effects; different payload under the same ID raises an alert. A durable worker processes the inbox; never rely on fire-and-forget promises after sending the response.

Before recording paid, verify through server-to-server lookup that provider reference, completed state, gross requested amount, TZS currency, and stored session/attempt association match. Verify the session-to-payment linkage format against actual provider responses: metadata alone, even signed, is insufficient linkage. Do not compare net-after-fees against quote total. Persist inbox processing, ledger insert, and attempt update transactionally. Unknown references or mismatches go to review; never mark an arbitrary order paid.

The supplied guide describes five delivery attempts with delays up to 24 minutes and advises a five-minute freshness window, but does not clarify whether retry signatures use a fresh timestamp. Verify this in testing. Do not disable freshness to compensate; reconcile missed/abandoned events through authenticated API reads. The worker must retry pending inbox records and sweep pending/unknown attempts using a durable scheduler. A webhook arriving before the create response is saved must be retained for later linking/reconciliation.

## Configuration and rollout

Server-only variables (placeholders in `.env.example`): `SNIPPE_API_KEY`, `SNIPPE_WEBHOOK_SECRET`, `SNIPPE_API_BASE_URL` (official host), `SNIPPE_WEBHOOK_URL`, `APP_URL`, and `SNIPPE_ENABLED=false`. API key and webhook secret are different values. Validate HTTPS callback origins from trusted configuration and provider checkout URL hosts against documented allowed hosts. Do not fetch arbitrary URLs supplied by customers.

Use collection-only scopes verified for sessions; do not grant payout scopes. Owner configures keys in local ignored env/host secret settings. Never ask them to paste keys into the prompt or commit/log them. Existing webhook setup must be checked against the final publicly reachable `/api/webhooks/snippe` URL. Do not overwrite another integration's webhook configuration without understanding its usage.

Deploy additive migrations and workers with feature disabled, verify signature handling and reconciliation, then enable for the intended environment. Feature flag blocks new initiation while webhook/reconciliation continue for in-flight payments. Rollback must preserve ledger/inbox data and process late events. Use verified provider test facilities if available; otherwise fixtures/mock transport first. A real-money smoke test requires a separately agreed amount and phone; documentation/keys-ready is not permission to charge. Do not create payouts or send test pushes automatically.

## Acceptance gates

- Existing guest order/catalogue/admin acceptance remains green; public catalogue has no price data.
- Staff can publish/revoke/rotate quotes; customers cannot change stored amount/currency/revision; invalid/expired tokens leak no order data.
- Customer sees exact amount and explicitly starts payment; no credentials or wallet PIN reach ChinaChapu.
- Concurrent clicks and create timeouts yield at most one unresolved attempt; 422, 429, 5xx, and lost responses handled without blind recreation.
- Realistic signed fixtures test raw whitespace, malformed/short/nonhex signatures, missing headers, stale/future timestamps, wrong secret, invalid JSON, duplicate and reordered events.
- DB failure before inbox commit returns retryable failure; worker crash/restart resumes; duplicate completion creates one ledger entry.
- Wrong amount/currency/reference/linkage, webhook-before-response, late success, cancelled order, and multiple successful attempts enter correct reconciliation/review paths.
- Redirect/query-string spoofing cannot set paid; pending/failed/expired states explain recovery; paid blocks further initiation and does not complete fulfillment.
- Missed webhooks recovered by authenticated provider lookup; fee/net fields cannot reduce the gross amount comparison.
- Session idempotency, actual units, session/payment linkage, retry timestamp semantics, and test-environment support are recorded with evidence before live enablement.
- Run existing lint/typecheck/tests/build plus payment integration tests against isolated DB and transport; record skipped/live checks honestly.
