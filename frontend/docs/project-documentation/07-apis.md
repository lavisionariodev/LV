# 07 — APIs

**Style:** REST-ish JSON **Next.js Route Handlers** — base path **`/api/*`**. No OpenAPI file in repo.

## Groups

| Prefix | Role |
|--------|------|
| `/api/checkout/*` | Create session, pay, payment status |
| `/api/payments/paymongo/webhook` | PayMongo events |
| `/api/buyer/*` | Orders, disputes, reviews, notification prefs |
| `/api/seller/*` | Listings, orders, payouts, documents, customers, … |
| `/api/admin/*` | Moderation, disputes, payouts, refunds, metrics, site content |
| `/api/auth/*` | QR login, seller signup password completion |
| `/api/notifications` | In-app notifications |
| `/api/profile/*` | Purchases, receipts |
| `/api/ratings/aggregates` | Rating aggregates |

## Auth

Session cookies (Supabase). Admin routes use server-side **`requireAdminApiUser()`**.