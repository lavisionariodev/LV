-- One escrow row per order: snapshotted commission at capture; admin releases net to seller.

create table if not exists public.order_escrows (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  seller_user_id uuid not null references public.sellers (user_id) on delete restrict,
  payment_id uuid references public.payments (id) on delete set null,
  gross_amount numeric(12, 2) not null check (gross_amount >= 0),
  commission_rate_percent numeric(5, 2) not null check (commission_rate_percent >= 0 and commission_rate_percent <= 100),
  commission_amount numeric(12, 2) not null check (commission_amount >= 0),
  net_amount numeric(12, 2) not null check (net_amount >= 0),
  currency text not null default 'PHP',
  status text not null default 'escrowed'
    check (status in ('escrowed', 'on_hold', 'released')),
  hold_reason text,
  released_at timestamptz,
  released_by uuid references auth.users (id) on delete set null,
  release_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_escrows_order_id_unique unique (order_id)
);

create index if not exists idx_order_escrows_seller_user_id_created_at
  on public.order_escrows (seller_user_id, created_at desc);

create index if not exists idx_order_escrows_status
  on public.order_escrows (status);

create index if not exists idx_order_escrows_payment_id
  on public.order_escrows (payment_id)
  where payment_id is not null;

drop trigger if exists trg_order_escrows_updated_at on public.order_escrows;
create trigger trg_order_escrows_updated_at
before update on public.order_escrows
for each row execute function public.set_updated_at();

alter table public.order_escrows enable row level security;
-- No policies for authenticated — access via service role only (webhook + verified admin routes).

comment on table public.order_escrows is
  'Per-order escrow: gross/commission/net snapshot after payment; admin transitions to released.';

-- Backfill escrows for already-paid orders (same rounding as frontend calcAmounts).
insert into public.order_escrows (
  order_id,
  seller_user_id,
  payment_id,
  gross_amount,
  commission_rate_percent,
  commission_amount,
  net_amount,
  currency,
  status
)
select
  o.id,
  o.seller_user_id,
  lp.payment_id,
  o.subtotal,
  coalesce(
    (select pb.default_commission_percent from public.platform_billing pb where pb.id = 1 limit 1),
    10::numeric
  )::numeric(5, 2),
  round(
    o.subtotal * coalesce(
      (select pb.default_commission_percent from public.platform_billing pb where pb.id = 1 limit 1),
      10::numeric
    ) / 100
  )::numeric(12, 2),
  o.subtotal
    - round(
        o.subtotal * coalesce(
          (select pb.default_commission_percent from public.platform_billing pb where pb.id = 1 limit 1),
          10::numeric
        ) / 100
      )::numeric(12, 2),
  coalesce(nullif(trim(o.currency), ''), 'PHP'),
  'escrowed'
from public.orders o
left join lateral (
  select poi.payment_id
  from public.payment_orders poi
  where poi.order_id = o.id
  order by poi.created_at desc
  limit 1
) lp on true
where o.payment_status = 'paid'
  and not exists (select 1 from public.order_escrows e where e.order_id = o.id);
