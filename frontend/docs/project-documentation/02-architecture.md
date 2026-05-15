# 02 — Architecture

## Diagram (logical)

```
Browser → Next.js (middleware + pages + /api/*)
       → Supabase (Auth, Postgres, RLS, Storage)
       → PayMongo (checkout, webhooks, refunds, payouts)
       → SMTP (transactional email)
```

## Main pieces

| Piece | Path / note |
|-------|----------------|
| Public + buyer UI | `src/app/(main)/`, `src/app/(auth)/buyer/` |
| Seller UI | `src/app/seller/`, `src/app/(auth)/seller/` |
| Admin UI | `src/app/admin/` · gate `/administrator` |
| Server API | `src/app/api/**` |
| Auth refresh + gates | `middleware.js` |
| OAuth callback | `src/app/(auth)/auth/callback/route.js` |
| Config | `next.config.ts` (PWA, redirects, Supabase image host) |

## Route gates (middleware)

- **`/admin/**`:** logged in + row in `public.admins` → else `/administrator`. Missing public Supabase env → fail closed to `/administrator`.
- **`/seller/**`:** logged in + `users.role = seller` + seller status allows portal (pending/rejected → onboarding; suspended → login). Public seller auth paths excluded.
