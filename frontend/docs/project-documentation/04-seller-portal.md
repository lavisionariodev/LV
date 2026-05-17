# 04 — Seller portal

**URL prefix:** `/seller/*` (Seller Centre)

## Auth entry

| Path | Purpose |
|------|---------|
| `/seller/login`, `/seller/signup` | Email/password and OAuth |
| `/seller/onboarding` | Application while `pending` / `rejected` |
| `/seller/login/qr/*` | Desktop QR login; approve from mobile/PWA |
| `/seller/need_help` | Help (public) |

Middleware public-path list: `middleware.js`.

## Main areas (`src/app/seller/`)

| Area | Paths |
|------|-------|
| Home | `/seller` |
| Orders | `/seller/orders` |
| Products | `/seller/products`, `catalog`, `new-listing`, `packages`, `services`, `archive` |
| Analytics | `/seller/analytics`, `revenue-reports`, `sales-overview`, `product-performance`, `customer-insights` |
| Wallet | `/seller/wallet` — balance, ledger, withdraw (PayMongo when enabled) |
| Customers · Reviews | `/seller/customers`, `/seller/reviews` |
| Marketing | `/seller/marketing/*` — **UI-only** (not persisted; not applied at checkout) |
| Notifications | `/seller/notifications` |
| Settings | `/seller/settings/*` — profile, shop-information, **payouts**, documents, password, notifications, **link-device** |
| Help · More | `/seller/help`, `/seller/more` |

**Payout settings** (`/seller/settings/payouts`) store bank/GCash details used by withdrawals. **Wallet** is the operational surface for balance and cash-out.

## Seller APIs (representative)

| Prefix | Purpose |
|--------|---------|
| `/api/seller/listings/*` | CRUD, images, submit/cancel review |
| `/api/seller/orders/*` | List, confirm, decline, fulfillment, refund, documents, analytics |
| `/api/seller/wallet/*` | Summary, transactions, withdrawals |
| `/api/seller/payout-settings` | Payout destination |
| `/api/seller/disputes/*` | Dispute detail & responses |
| `/api/seller/sessions/*` | Portal device sessions (link device) |
| `/api/auth/qr/*` | QR login challenge lifecycle |
