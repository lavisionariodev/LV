# 03 — Public website

Base: **`/`** and routes under **`src/app/(main)/`** (and buyer auth under `(auth)/buyer/`).

## Key routes

| Path | Purpose |
|------|---------|
| `/` | Home |
| `/shop`, `/shop/[id]`, `/shop/compare` | Catalog, detail, compare |
| `/cart`, `/checkout`, `/checkout/success`, `/checkout/failed` | Cart & checkout |
| `/favorites` | Saved items |
| `/profile`, `/profile/*` | Buyer account, purchases, notifications |
| `/about`, `/how-it-works`, `/partners` | Marketing / directory |
| `/seller-profile` | Public seller page (`?seller=` required → else `/partners`) |
| `/buyer/login`, `/buyer/signup` | Buyer auth (Google/Facebook via Supabase) |

## Caveats (see gap tracker)

Coupons UI-only vs checkout; some static/marketing copy; footer fallbacks if CMS fields empty; no in-app buyer↔seller messaging (links only).