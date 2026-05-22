# 07 — APIs

**Style:** REST-ish JSON **Next.js Route Handlers** under `src/app/api/` (~81 route files). No OpenAPI spec in repo.

**Auth:** Supabase session cookies. Admin routes use `requireAdminApiUser()`. Seller/buyer routes enforce role and ownership.

## Groups

| Prefix | Role |
|--------|------|
| `/api/checkout/*` | `create`, `pay`, `payments/[paymentId]/status` |
| `/api/payments/paymongo/webhook` | PayMongo events (signature verified) |
| `/api/buyer/*` | Orders, cancel, disputes, reviews, notification prefs |
| `/api/seller/*` | Listings, orders, wallet, payouts, documents, customers, disputes, settings, sessions, dashboard-alerts, escrow-summary |
| `/api/admin/*` | Moderation, disputes, payouts, refunds, metrics, site content, platform billing |
| `/api/auth/*` | QR login (`qr/challenge`, `approve`, `deny`); seller `complete-signup-password` |
| `/api/notifications` | In-app notifications (list, mark read, delete) |
| `/api/profile/purchases/*` | Purchases helpers, receipt PDF, seller names |
| `/api/ratings/aggregates` | Listing rating aggregates |
| `/api/services/[serviceId]/reviews` | Public service reviews |

## Seller wallet (preferred)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/seller/wallet` | Balance summary + recent withdrawals |
| GET | `/api/seller/wallet/transactions` | Ledger rows (paginated) |
| GET | `/api/seller/wallet/withdrawals` | Withdrawal history |
| POST | `/api/seller/wallet/withdraw` | Request withdrawal |

## Admin payouts (representative)

| Path | Purpose |
|------|---------|
| `/api/admin/payouts` | List / query payout state |
| `/api/admin/payouts/release`, `release-batch` | Credit seller wallet from escrow |
| `/api/admin/payouts/hold`, `unhold` | Hold releases |
| `/api/admin/payouts/commission` | Platform commission |
| `/api/admin/payouts/ledger-adjustment` | Manual ledger adjustment |
| `/api/admin/payouts/disbursement-config` | PayMongo disbursement toggles + `opsHealth` |
| `/api/admin/treasury` | Platform commission summary, chart series, PayMongo ops health |
| `/api/admin/platform-billing` | Commission default, legal fields, settlement destination (bank/GCash/manual) |
| `/api/admin/refunds/stuck` | Stuck refund reconciliation |

Implementation roots: `src/lib/payments/`, `src/lib/paymongo/`, `src/lib/auth/requireApiUser.js`, `src/lib/auth/admin.js`.
