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
- **Verification:** migration `112` adds `verification_status` on `seller_payout_settings`. Bank/GCash details require **admin approval** before automated withdraw (`/admin/sellers` → Compliance tab). Seller API returns **masked** account numbers only.
- **Fees:** `seller_withdrawals.fee_php` / `net_amount_php` (migration `111`). Platform fee from `PLATFORM_WITHDRAWAL_FEE_PHP` (default `0`, deducted from gross before PayMongo transfer). **PayMongo processor fees** are absorbed by the platform separately.

Withdrawals run when `PAYMONGO_DISBURSEMENT_ENABLED=true`, payout settings are **approved**, and webhook settles transfer status. Only one `pending`/`submitted` withdrawal per seller at a time (DB partial unique index).

## Platform commission (business earnings)

- **UI:** `/admin/earnings` — ledger-based commission totals, seller liability estimates, PayMongo health checklist.
- **API:** `GET /api/admin/treasury?range=7d|30d`
- **Settlement config:** Admin → Settings → Billing — company bank/GCash/manual destination (`platform_billing`, migration `113`). This is for reference and handover; **commission cash-out is via the PayMongo merchant dashboard**, not an in-app withdraw button.
- Commission is fixed on `order_escrows` at payment; only **net** is credited to seller wallets on admin release.

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
| `PLATFORM_WITHDRAWAL_FEE_PHP` | Optional platform fee deducted from seller gross withdrawal (default `0`) |
| `ADMIN_NOTIFY_EVERY_PAID_ORDER` | Email admins on each paid order (when `true`) |

Details: `frontend/README.md`. Code: `src/lib/paymongo/`, `src/lib/payments/`, `src/lib/seller/walletClient.js`.
