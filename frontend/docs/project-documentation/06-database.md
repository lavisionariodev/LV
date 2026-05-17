# 06 — Database

**Platform:** Supabase (PostgreSQL). **107** SQL files in `supabase/migrations/` (numbered through `111_*`) — apply **in filename order** (see `frontend/README.md`).

## Notable migrations (wallet & portal)

| File | Topic |
|------|--------|
| `065_order_escrows.sql` | Escrow per paid order |
| `053_orders_payments_tables.sql` | Orders, payments (default currency **PHP**) |
| `094_refund_paymongo_escrow_disputes_notifications.sql` | Refunds, disputes, notifications |
| `099_dispute_events.sql` | Dispute audit events |
| `105_seller_qr_login_challenges.sql` | QR login challenges |
| `106_seller_portal_sessions.sql` | Seller Centre session tracking |
| `107_wallet_ledger_disbursements.sql` | `seller_wallet_ledger`, `payout_disbursements` |
| `108_buyer_notification_prefs_commission_log.sql` | Buyer notification prefs, commission change log |
| `109_seller_portal_sessions_per_device.sql` | Sessions keyed by device (IP hash) |
| `110_seller_withdrawals_wallet_flow.sql` | `seller_withdrawals` (PayMongo bank/GCash) |
| `111_seller_wallet_portal_enhancements.sql` | Withdrawal fee/net columns, payout-settings FK |

## Core concepts

| Concept | Notes |
|---------|--------|
| `auth.users` | Supabase identities |
| `public.users` | App user; `role`: `buyer` \| `seller`; `status` for suspension |
| `public.admins` | Admin allowlist |
| `public.sellers` | Seller profile, approval status, shop fields |
| `public.seller_listings` | Packages/services; moderation workflow |
| `public.orders`, `order_items`, `payments` | Checkout and fulfillment |
| `public.order_escrows` | Platform-held funds until admin release |
| `public.seller_wallet_ledger` | Credits/debits after release (derived balance) |
| `public.seller_withdrawals` | Seller cash-out to bank/GCash |
| `public.seller_payout_settings` | Payout destination per seller |
| `public.user_notifications` | In-app notification rows |
| `public.site_content` | CMS key/value for marketing copy |

## Access

- **Browser:** Supabase client + **RLS** on many reads/writes.
- **Server:** **`SUPABASE_SERVICE_ROLE_KEY`** for admin APIs, webhooks, wallet ledger, QR login — **never expose to client.**
