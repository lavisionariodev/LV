-- Orders + payments primitives for PayMongo checkout (multi-seller).
-- This migration intentionally keeps client write access minimal; server routes / RPC handle writes.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_user_id uuid not null references public.sellers(user_id) on delete restrict,
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'paid', 'cancelled', 'failed')),
  currency text not null default 'PHP',
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),

  contact_name text,
  contact_email text,
  contact_phone text,
  preferred_date date,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_buyer_id_created_at
  on public.orders (buyer_id, created_at desc);

create index if not exists idx_orders_seller_user_id_created_at
  on public.orders (seller_user_id, created_at desc);

create index if not exists idx_orders_status
  on public.orders (status);

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

alter table public.orders enable row level security;

drop policy if exists "buyer_read_own_orders" on public.orders;
create policy "buyer_read_own_orders"
on public.orders
for select
to authenticated
using (buyer_id = auth.uid());

drop policy if exists "seller_read_own_orders" on public.orders;
create policy "seller_read_own_orders"
on public.orders
for select
to authenticated
using (seller_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- order_items
-- ---------------------------------------------------------------------------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null,
  name text not null,
  price numeric(12,2) not null default 0 check (price >= 0),
  quantity int not null default 1 check (quantity >= 1),
  seller_user_id uuid not null references public.sellers(user_id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_items_order_id
  on public.order_items (order_id);

create index if not exists idx_order_items_seller_user_id
  on public.order_items (seller_user_id);

alter table public.order_items enable row level security;

drop policy if exists "read_order_items_if_related" on public.order_items;
create policy "read_order_items_if_related"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and (o.buyer_id = auth.uid() or o.seller_user_id = auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'paymongo',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'expired')),
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'PHP',

  paymongo_checkout_id text,
  paymongo_reference text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists idx_payments_buyer_id_created_at
  on public.payments (buyer_id, created_at desc);

create index if not exists idx_payments_status
  on public.payments (status);

create unique index if not exists idx_payments_paymongo_checkout_id_unique
  on public.payments (paymongo_checkout_id)
  where paymongo_checkout_id is not null;

create unique index if not exists idx_payments_paymongo_reference_unique
  on public.payments (paymongo_reference)
  where paymongo_reference is not null;

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

alter table public.payments enable row level security;

drop policy if exists "buyer_read_own_payments" on public.payments;
create policy "buyer_read_own_payments"
on public.payments
for select
to authenticated
using (buyer_id = auth.uid());

-- ---------------------------------------------------------------------------
-- payment_orders join table
-- ---------------------------------------------------------------------------
create table if not exists public.payment_orders (
  payment_id uuid not null references public.payments(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (payment_id, order_id)
);

create index if not exists idx_payment_orders_order_id
  on public.payment_orders (order_id);

alter table public.payment_orders enable row level security;

drop policy if exists "read_payment_orders_if_related" on public.payment_orders;
create policy "read_payment_orders_if_related"
on public.payment_orders
for select
to authenticated
using (
  exists (
    select 1
    from public.payments p
    where p.id = payment_orders.payment_id
      and p.buyer_id = auth.uid()
  )
  or exists (
    select 1
    from public.orders o
    where o.id = payment_orders.order_id
      and o.seller_user_id = auth.uid()
  )
);

