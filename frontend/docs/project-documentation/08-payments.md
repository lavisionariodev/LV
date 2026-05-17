# 08 — Payments

**Provider:** PayMongo (Philippines-oriented). Orders default to **PHP** in schema.

## Money flow

```
Buyer pays (PayMongo checkout)
    → order_escrows (platform escrow)
    → Admin release payout → seller_wallet_ledger (payout_release)
    → Seller withdraws → seller_withdrawals → PayMongo transfer (bank/GCash)
```

Legacy per-order PayMongo releases (before migration `110`) remain in `payout_disbursements` for reconciliation only.

## Seller wallet portal

- **UI:** `/seller/wallet`
- **APIs:** `/api/seller/wallet`, `.../transactions`, `.../withdrawals`, `.../withdraw`
- **Settings:** `/seller/settings/payouts` — destination account; migration `111` links withdrawals to `seller_payout_settings`
- **Fees:** `seller_withdrawals.fee_php` / `net_amount_php` (migration `111`)

Withdrawals run when `PAYMONGO_DISBURSEMENT_ENABLED=true` and webhook settles transfer status.

## Webhook (required for live behavior)

- **URL:** `https://<your-host>/api/payments/paymongo/webhook`
- **Secret:** `PAYMONGO_WEBHOOK_SECRET` — HMAC verification on the route handler.

Paid/failed checkout, refunds, and withdrawal transfer settlement are **webhook-driven**, not only the success page.

## Env (names only)

| Variable | Use |
|----------|-----|
| `PAYMONGO_SECRET_KEY` | Server API |
| `PAYMONGO_WEBHOOK_SECRET` | Webhook verification |
| `PAYMONGO_DISBURSEMENT_ENABLED` | Toggle automated **seller withdrawals** |
| `PAYMONGO_WALLET_SOURCE_*`, `PAYMONGO_DEFAULT_DESTINATION_BIC` | Platform wallet source + destination config |
| `ADMIN_NOTIFY_EVERY_PAID_ORDER` | Email admins on each paid order (when `true`) |

Details: `frontend/README.md`. Code: `src/lib/paymongo/`, `src/lib/payments/`, `src/lib/seller/walletClient.js`.
