# 09 — Deployment

## Build & run (`frontend/`)

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
npm run lint
npm test             # unit tests under src/lib/auth, payments, paymongo, ratings, seller
```

## Pre-flight

1. Apply all Supabase migrations in order (through `111_seller_wallet_portal_enhancements.sql`).
2. Set env vars on the host (`frontend/README.md`).
3. Register PayMongo webhook → production URL + matching `PAYMONGO_WEBHOOK_SECRET`.
4. Configure SMTP if email notifications are required.
5. Confirm at least one `public.admins` user for break-glass access.
6. For seller withdrawals: migrations `107`+`110`+`111`, payout settings saved, `PAYMONGO_DISBURSEMENT_ENABLED=true`.

## Hosting

**Suggested:** Vercel (production URL in [01-overview](./01-overview.md)). Set all server env vars in the project dashboard; never commit `.env.local`.

## PWA

`next-pwa` writes the service worker to `public/` on production build. Disabled in development. Used for installable Seller Centre / QR login flows.
