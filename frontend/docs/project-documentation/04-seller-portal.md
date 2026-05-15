# 04 — Seller portal

**URL prefix:** `/seller/*`

## Auth entry

`/seller/login`, `/seller/signup`, `/seller/onboarding`, `/seller/login/qr/*` — see `middleware.js` for public vs protected paths.

## Main areas (under `src/app/seller/`)

| Area | Example paths |
|------|----------------|
| Home | `/seller` |
| Orders | `/seller/orders` |
| Products | `/seller/products`, `catalog`, `new-listing`, `packages`, `services`, `archive` |
| Analytics | `/seller/analytics`, `revenue-reports`, `sales-overview`, … |
| Customers · Reviews | `/seller/customers`, `/seller/reviews` |
| Marketing | `/seller/marketing/*` — **mostly mock / UI-only** (see gap tracker) |
| Notifications | `/seller/notifications` |
| Settings | `/seller/settings/*` (profile, shop-information, payouts, documents, password, notifications, link-device) |
| Help | `/seller/help` |