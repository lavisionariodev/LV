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

1. Browse shop → **add to cart** on any listing kind (service, package, or product).
2. **Cart** groups **services & packages** (booking lane) separately from **products** (checkout lane). Only one lane can be selected at a time for payment.
3. **Book now** (services/packages) or **Checkout** (products) on listing detail goes to `/checkout?items=…` with the same PayMongo path.
4. **Checkout** copy and form fields depend on lane: booking collects preferred schedule and service location; product checkout hides those fields and uses order-focused labels.
5. `POST /api/checkout/create` then PayMongo; payment confirmation is **webhook-driven** (`/api/payments/paymongo/webhook`), not only the success page.
6. Purchases, cancel, refund request, disputes, and per-order reviews use `/api/buyer/*` and profile APIs.

## Listing kinds (seller)

| Kind | Seller form | Buyer primary CTA |
|------|-------------|-------------------|
| Service | Duration, coverage, optional package tiers | Book now |
| Package | Package options (tiers) | Book now |
| Product | Product details, stock; no duration/tiers | Checkout |

## Contact & messaging

Listing and seller profile pages offer **external** contact (phone, email, social). There is no in-app buyer↔seller chat thread.
