-- Seller wallet portal: withdrawal fee/net columns and payout settings link (PayMongo-ready).
-- Balances remain derived from order_escrows + seller_wallet_ledger; no duplicate wallet table.

alter table public.seller_withdrawals
  add column if not exists fee_php numeric(12, 2) not null default 0
    check (fee_php >= 0);

alter table public.seller_withdrawals
  add column if not exists net_amount_php numeric(12, 2);

alter table public.seller_withdrawals
  add column if not exists payout_settings_seller_user_id uuid
    references public.seller_payout_settings (seller_user_id) on delete set null;

alter table public.seller_withdrawals
  add column if not exists admin_notes text;

comment on column public.seller_withdrawals.fee_php is
  'Platform/payment processor fee deducted from gross withdrawal; net_amount_php = amount_php - fee_php.';

comment on column public.seller_withdrawals.net_amount_php is
  'Amount sent to seller payout destination after fees; set server-side on insert.';

comment on column public.seller_withdrawals.payout_settings_seller_user_id is
  'FK to seller_payout_settings row used at withdrawal time (seller_user_id is the settings PK).';

comment on column public.seller_withdrawals.admin_notes is
  'Internal admin notes; writable only via service role / admin APIs.';

-- Backfill net_amount for existing rows
update public.seller_withdrawals
set net_amount_php = amount_php - fee_php
where net_amount_php is null;

create index if not exists idx_seller_withdrawals_seller_status_created
  on public.seller_withdrawals (seller_user_id, status, created_at desc);
