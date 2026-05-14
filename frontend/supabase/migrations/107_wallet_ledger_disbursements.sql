-- Append-only seller wallet ledger + PayMongo payout disbursement tracking.
-- order_escrows remains the per-order source of truth; released rows without a disbursement
-- record are treated as legacy manual payouts in application code.

create table if not exists public.payout_disbursements (
  id uuid primary key default gen_random_uuid(),
  escrow_id uuid not null references public.order_escrows (id) on delete restrict,
  order_id uuid not null references public.orders (id) on delete restrict,
  seller_user_id uuid not null references public.sellers (user_id) on delete restrict,
  amount_php numeric(12, 2) not null check (amount_php >= 0),
  currency text not null default 'PHP',
  destination_snapshot jsonb not null default '{}'::jsonb,
  paymongo_batch_id text,
  paymongo_transfer_id text,
  status text not null default 'pending'
    check (status in ('pending', 'submitted', 'succeeded', 'failed', 'cancelled')),
  failure_reason text,
  submitted_at timestamptz,
  settled_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  approved_request_id uuid references public.seller_payout_requests (id) on delete set null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payout_disbursements_idempotency_key_unique unique (idempotency_key)
);

create unique index if not exists idx_payout_disbursements_escrow_active
  on public.payout_disbursements (escrow_id)
  where status in ('pending', 'submitted', 'succeeded');

create index if not exists idx_payout_disbursements_seller_created
  on public.payout_disbursements (seller_user_id, created_at desc);

create index if not exists idx_payout_disbursements_order_id
  on public.payout_disbursements (order_id);

create index if not exists idx_payout_disbursements_paymongo_transfer_id
  on public.payout_disbursements (paymongo_transfer_id)
  where paymongo_transfer_id is not null;

drop trigger if exists trg_payout_disbursements_updated_at on public.payout_disbursements;
create trigger trg_payout_disbursements_updated_at
before update on public.payout_disbursements
for each row execute function public.set_updated_at();

alter table public.payout_disbursements enable row level security;

comment on table public.payout_disbursements is
  'Per-escrow PayMongo disbursement attempts; service role only.';

create table if not exists public.seller_wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  seller_user_id uuid not null references public.sellers (user_id) on delete restrict,
  order_id uuid references public.orders (id) on delete set null,
  escrow_id uuid references public.order_escrows (id) on delete set null,
  disbursement_id uuid references public.payout_disbursements (id) on delete set null,
  entry_type text not null
    check (entry_type in ('order_payment', 'held_funds', 'payout_release', 'withdrawal', 'refund', 'adjustment')),
  amount_php numeric(12, 2) not null,
  currency text not null default 'PHP',
  metadata jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  constraint seller_wallet_ledger_idempotency_key_unique unique (idempotency_key)
);

create index if not exists idx_seller_wallet_ledger_seller_created
  on public.seller_wallet_ledger (seller_user_id, created_at desc);

create index if not exists idx_seller_wallet_ledger_escrow_id
  on public.seller_wallet_ledger (escrow_id)
  where escrow_id is not null;

alter table public.seller_wallet_ledger enable row level security;

comment on table public.seller_wallet_ledger is
  'Append-only seller wallet events; balances are derived in application code.';
