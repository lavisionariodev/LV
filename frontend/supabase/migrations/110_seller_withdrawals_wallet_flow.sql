-- Seller wallet withdrawals (PayMongo transfer to bank/GCash after admin credits wallet).
-- seller_payout_requests is unused after this migration (kept for historical FKs).

create table if not exists public.seller_withdrawals (
  id uuid primary key default gen_random_uuid(),
  seller_user_id uuid not null references public.sellers (user_id) on delete restrict,
  amount_php numeric(12, 2) not null check (amount_php > 0),
  currency text not null default 'PHP',
  destination_snapshot jsonb not null default '{}'::jsonb,
  paymongo_batch_id text,
  paymongo_transfer_id text,
  status text not null default 'pending'
    check (status in ('pending', 'submitted', 'succeeded', 'failed', 'cancelled')),
  failure_reason text,
  submitted_at timestamptz,
  settled_at timestamptz,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_withdrawals_idempotency_key_unique unique (idempotency_key)
);

create index if not exists idx_seller_withdrawals_seller_created
  on public.seller_withdrawals (seller_user_id, created_at desc);

create index if not exists idx_seller_withdrawals_paymongo_transfer_id
  on public.seller_withdrawals (paymongo_transfer_id)
  where paymongo_transfer_id is not null;

drop trigger if exists trg_seller_withdrawals_updated_at on public.seller_withdrawals;
create trigger trg_seller_withdrawals_updated_at
before update on public.seller_withdrawals
for each row execute function public.set_updated_at();

alter table public.seller_withdrawals enable row level security;

comment on table public.seller_withdrawals is
  'Seller-initiated withdrawals from platform wallet to bank/GCash via PayMongo; service role only.';

comment on table public.seller_payout_requests is
  'Deprecated after 110: replaced by seller_withdrawals. Retained for historical rows only.';
