# 03 — Public website

Base: **`/`** and routes under **`src/app/(main)/`** (buyer auth under `(auth)/buyer/`).

## Key routes

| Path | Purpose |
|------|---------|
| `/` | Home |
| `/shop`, `/shop/[id]`, `/shop/compare` | Catalog, detail, compare |
| `/cart`, `/checkout`, `/checkout/success`, `/checkout/failed` | Cart & PayMongo checkout |
| `/favorites` | Saved listings (Supabase-backed) |
| `/profile`, `/profile/account`, `/profile/password` | Buyer account |
| `/profile/purchases` | Order history, receipts, reviews |
| `/profile/notifications`, `/profile/notifications/preferences` | In-app feed & prefs |
| `/about`, `/how-it-works`, `/partners` | Marketing; partners directory (approved sellers) |
| `/seller-profile` | Public seller page (`?seller=` required → else `/partners`) |
| `/buyer/login`, `/buyer/signup` | Buyer auth (Google/Facebook via Supabase) |
| `/auth/reset-password` | Password recovery (Supabase) |

## Buyer flows

1. Browse shop → add to cart (or book now) → checkout collects service/contact fields → `POST /api/checkout/create` then PayMongo.
2. Payment confirmation is **webhook-driven** (`/api/payments/paymongo/webhook`), not only the success page.
3. Purchases, cancel, refund request, disputes, and per-order reviews use `/api/buyer/*` and profile APIs.

## Contact & messaging

Listing and seller profile pages offer **external** contact (phone, email, social). There is no in-app buyer↔seller chat thread.
