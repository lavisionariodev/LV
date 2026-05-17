# 02 — Architecture

## Diagram (logical)

```
Browser → Next.js (middleware + pages + /api/*)
       → Supabase (Auth, Postgres, RLS, Storage)
       → PayMongo (checkout, webhooks, refunds, payouts)
       → SMTP (transactional email)
```

## Repository layout (`frontend/`)

| Path | Role |
|------|------|
| `src/app/` | App Router: pages, layouts, Route Handlers under `api/` |
| `src/components/` | Shared UI (layout shells, modals, loaders) |
| `src/contexts/` | React providers: `Auth`, `Cart`, `Favorites`, `Profile`, toasts, buyer notification feed |
| `src/features/` | Portal-specific bundles (e.g. seller settings tabs) |
| `src/lib/` | Domain logic: auth, payments, PayMongo, orders, notifications, ratings, email |
| `src/shared/` | Cross-cutting hooks and utilities |
| `supabase/migrations/` | Ordered SQL migrations (apply by filename prefix) |
| `docs/project-documentation/` | Handover docs (this set) |

## Route groups

| Piece | Path / note |
|-------|----------------|
| Public + buyer UI | `src/app/(main)/`, `src/app/(auth)/buyer/` |
| Seller UI | `src/app/seller/`, `src/app/(auth)/seller/` |
| Admin UI | `src/app/admin/` · gate `/administrator` |
| Server API | `src/app/api/**` (~83 route files) |
| Auth refresh + gates | `middleware.js` |
| OAuth callback | `src/app/(auth)/auth/callback/route.js` |
| Password reset | `src/app/(auth)/auth/reset-password/` |
| Config | `next.config.ts` (PWA, redirects, Supabase image host) |

## Route gates (middleware)

- **`/admin/**`:** session + row in `public.admins` → else `/administrator`. Missing public Supabase env → fail closed to `/administrator`.
- **`/seller/**`:** session + `users.role = seller` + seller status allows portal (`pending` / `rejected` → onboarding; `suspended` → login). Public seller auth paths excluded (`/seller/login`, `/seller/signup`, `/seller/onboarding`, `/seller/login/qr/*`, etc.).

Admin layouts also run client-side `requireAdmin()` as a fallback.

## Auth patterns

| Consumer | Pattern |
|----------|---------|
| Browser (buyer/seller) | Supabase anon key + session cookies; RLS on many reads |
| Admin / webhook / ledger APIs | `SUPABASE_SERVICE_ROLE_KEY` via server helpers — never exposed to the client |
| API routes | `requireApiUser`, `requireAdminApiUser`, role checks per route |
