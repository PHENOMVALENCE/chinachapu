# Snippe provider contract (verified 2026-09-06)

Retrieved from official docs at `https://docs.snippe.sh/docs/2026-01-25/`. Guide facts in `SNIPPE-INTEGRATION.md` were cross-checked. Live create/lookup against an owner account was **not** performed.

## Chosen flow

Hosted payment sessions (`POST /api/v1/sessions`). Direct `POST /v1/payments` (USSD push) is not used.

## Verified

| Topic | Evidence |
| --- | --- |
| Host | Guide: `https://api.snippe.sh`. Merchant session paths are `/api/v1/sessions`. |
| Auth | `Authorization: Bearer <token>`. WHMCS docs describe API keys `snp_...`. |
| Create/get/cancel session | Official sessions page. |
| Amount | Integer, minimum 500, currency `TZS`. Session examples use `50000` for TZS 50,000. Payment list example uses `value: 500` for TZS 500. **No cents multiplier is applied.** Line-item copy still says “smallest currency unit”; confirm one known amount on hosted checkout before live enablement. |
| Session states | pending, active, completed, expired, cancelled |
| Payment states | pending, completed, failed, voided, expired |
| Checkout host | `https://snippe.me/checkout/...` and `https://snippe.me/p/...` |
| Session expiry | `expires_in` 60–86400 seconds, default 3600 |
| Webhook events | payment.completed, payment.failed, payment.voided, payment.expired |
| Signature | hex HMAC-SHA256 of `{timestamp}.{raw_body}`; headers `X-Webhook-Timestamp`, `X-Webhook-Signature`; 64 hex chars |
| Freshness | Official recommendation: reject timestamps older than 300 seconds |
| Webhook amount | `data.amount.value` + `data.amount.currency`; compare **gross** (`settlement.gross` when present), never net-after-fees |
| Payment lookup | `GET /v1/payments/{reference}` |
| Session–payment link | Session webhook example includes `data.session_reference`. Payment webhook `data.reference` is the payment reference. Metadata is not treated as sufficient linkage. |
| Rate limit | Guide: 60 requests/minute, `X-Ratelimit-Reset` seconds. Not restated on the sessions page. |

## Unverified (blocks live enablement)

- Session create **idempotency** is not documented. Idempotency-Key is documented only for `POST /v1/payments`. This implementation never retries an uncertain session create with a new or reused key.
- Whether webhook retries refresh `X-Webhook-Timestamp` is not documented. Freshness stays 300s; missed events are recovered by authenticated lookup.
- Exact credential scope names (collection-only vs payout) were not retrieved from a live account.
- Sandbox/test host: none documented; none invented.

## Implementation stance

`SNIPPE_ENABLED=false` by default. Initiation is blocked until enabled. Webhook intake and reconciliation stay available when secrets are present so late events can still be processed.
