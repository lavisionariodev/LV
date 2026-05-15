# 08 — Payments

**Provider:** PayMongo (Philippines-oriented; orders default **PHP** in schema).

## Webhook (required for live behavior)

- **URL:** `https://<your-host>/api/payments/paymongo/webhook`
- **Secret:** `PAYMONGO_WEBHOOK_SECRET` — signature verification on the route handler.

Paid/failed checkout, refunds, and disbursement settlement are **webhook-driven**, not only the success page.

## Env (names only)

| Variable | Use |
|----------|-----|
| `PAYMONGO_SECRET_KEY` | Server API |
| `PAYMONGO_WEBHOOK_SECRET` | Webhook verification |
| `PAYMONGO_DISBURSEMENT_ENABLED` | Toggle automated disbursements |
| `PAYMONGO_WALLET_SOURCE_*`, `PAYMONGO_DEFAULT_DESTINATION_BIC` | Payout source/destination config |
| `ADMIN_NOTIFY_EVERY_PAID_ORDER` | Email admins on each paid order (when `true`) |

Details: `frontend/README.md`. Implementation: `src/lib/paymongo/`, `src/lib/payments/`, `src/app/api/payments/paymongo/webhook/`.