# 06 — Database

**Platform:** Supabase (PostgreSQL).

**Migrations:** `supabase/migrations/` — apply **in filename order** (see `frontend/README.md`).

## Notable migrations

- `107_wallet_ledger_disbursements.sql` — payouts / ledger / disbursements
- `108_buyer_notification_prefs_commission_log.sql` — buyer notification prefs, commission log

## Core concepts (abbrev.)

- `auth.users` — Supabase identities  
- `public.users` — `role`: `buyer` \| `seller`  
- `public.admins` — admin allowlist  
- `public.sellers`, listings, orders, payments — evolved across migrations (default currency **PHP** in orders/payments migration)

## Access

- **Browser:** Supabase client + **RLS** on many reads.  
- **Server:** **`SUPABASE_SERVICE_ROLE_KEY`** for admin APIs, webhooks, ledger writes — **never expose to client.**