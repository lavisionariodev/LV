# 08 — Payments

**Provider:** PayMongo (Philippines-oriented; orders default **PHP** in schema).

## Flow

1. Buyer pays via PayMongo checkout → funds held in platform escrow (`order_escrows`).
2. Admin **release payout** credits the seller platform wallet (`payout_release` ledger).
3. Seller **withdraws** from Seller Settings / Revenue → PayMongo transfer to bank or GCash (`seller_withdrawals`).

Legacy per-order PayMongo releases (before migration 110) remain in `payout_disbursements` for reconciliation only.

## Webhook (required for live behavior)

- **URL:** `https://<your-host>/api/payments/paymongo/webhook`
- **Secret:** `PAYMONGO_WEBHOOK_SECRET` — signature verification on the route handler.

Paid/failed checkout, refunds, and withdrawal transfer settlement are **webhook-driven**, not only the success page.

## Env (names only)

| Variable | Use |
|----------|-----|
| `PAYMONGO_SECRET_KEY` | Server API |
| `PAYMONGO_WEBHOOK_SECRET` | Webhook verification |
| `PAYMONGO_DISBURSEMENT_ENABLED` | Toggle automated **seller withdrawals** |
| `PAYMONGO_WALLET_SOURCE_*`, `PAYMONGO_DEFAULT_DESTINATION_BIC` | Platform wallet source + destination config |
| `ADMIN_NOTIFY_EVERY_PAID_ORDER` | Email admins on each paid order (when `true`) |

Details: `frontend/README.md`. Implementation: `src/lib/paymongo/`, `src/lib/payments/`, `src/app/api/payments/paymongo/webhook/`.
