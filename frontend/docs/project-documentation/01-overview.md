# 01 — Overview

**Product:** Lavisionario — a Philippines-oriented funeral and memorial services marketplace. One Next.js app serves **buyers** (public shop + account), **sellers** (Seller Centre), and **admins** (operations console).

**In repo:** Single app under `frontend/` — UI + Route Handlers (`src/app/api/`). Data and auth: **Supabase** (PostgreSQL, Auth, Storage, RLS). Payments: **PayMongo** (checkout, escrow, refunds, seller withdrawals).

## Product scope (implemented)

| Portal | Core capabilities |
|--------|-------------------|
| Public / buyer | Shop catalog, compare, cart, PayMongo checkout, favorites, profile & purchases, receipts, reviews, disputes, notification prefs |
| Seller | Onboarding & compliance docs, listings (catalog / packages / services), orders & fulfillment, analytics, customers, reviews, wallet & withdrawals, settings, QR login, device sessions |
| Admin | Dashboard metrics, platform earnings & PayMongo health, buyers & sellers, listing moderation, disputes, escrow payouts & commission, billing settlement, stuck refunds, site content CMS, notification prefs |

## Environments

| Env | URL |
|-----|-----|
| Local | `http://localhost:3000` |
| Production | `https://lavisionario.vercel.app` |

## Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router), React 19 |
| Styling | Tailwind CSS 4, CSS modules per route |
| Data | Supabase JS (`@supabase/ssr`, `@supabase/supabase-js`) |
| Payments | PayMongo REST + webhooks |
| Email | Nodemailer (SMTP) |
| Charts | Recharts |
| PWA | `next-pwa` (disabled in `NODE_ENV=development`) |
| Tests | Node built-in test runner (`npm test` — `src/lib/**` unit tests) |
