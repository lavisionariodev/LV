-- PayMongo refund fields, escrow terminal refunded, payments status expansion,
-- order refund audit, disputes, and in-app notifications.

-- ---------------------------------------------------------------------------
-- payments: PayMongo payment id + refund tracking + expanded status
-- ---------------------------------------------------------------------------
alter table public.payments
  drop constraint if exists payments_status_check;

alter table public.payments
  add constraint payments_status_check
  check (
    status = any (
      array[
        'pending'::text,
        'paid'::text,
        'failed'::text,
        'expired'::text,
        'refunded'::text,
        'partially_refunded'::text
      ]
    )
  );

alter table public.payments
  add column if not exists paymongo_payment_id text,
  add column if not exists paymongo_refund_id text,
  add column if not exists paymongo_refund_status text,
  add column if not exists refunded_amount_php numeric(12, 2) default 0 check (refunded_amount_php >= 0),
  add column if not exists refunded_at timestamptz;

create index if not exists idx_payments_paymongo_payment_id
  on public.payments (paymongo_payment_id)
  where paymongo_payment_id is not null;

create index if not exists idx_payments_paymongo_refund_id
  on public.payments (paymongo_refund_id)
  where paymongo_refund_id is not null;

comment on column public.payments.paymongo_payment_id is 'PayMongo Payment resource id (from payment.paid webhook).';
comment on column public.payments.paymongo_refund_id is 'Latest PayMongo Refund resource id for this payment row.';
comment on column public.payments.paymongo_refund_status is 'Mirror of PayMongo refund status from webhooks.';
comment on column public.payments.refunded_amount_php is 'Cumulative refunded amount in PHP for partial refunds.';

-- ---------------------------------------------------------------------------
-- orders: refund completion audit
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists refund_completed_at timestamptz,
  add column if not exists paymongo_refund_id text,
  add column if not exists refund_reason text,
  add column if not exists refund_decline_reason text;

comment on column public.orders.refund_completed_at is 'When PayMongo (or admin) marked refund terminal success.';
comment on column public.orders.paymongo_refund_id is 'PayMongo Refund id tied to this order refund.';
comment on column public.orders.refund_reason is 'Buyer-provided reason when opening dispute / refund request.';
comment on column public.orders.refund_decline_reason is 'Seller-provided reason when declining a refund request.';

-- ---------------------------------------------------------------------------
-- order_escrows: terminal refunded (do not release payout)
-- ---------------------------------------------------------------------------
alter table public.order_escrows
  drop constraint if exists order_escrows_status_check;

alter table public.order_escrows
  add constraint order_escrows_status_check
  check (status in ('escrowed', 'on_hold', 'released', 'refunded'));

comment on column public.order_escrows.status is 'escrowed | on_hold | released | refunded (buyer refunded; never pay seller).';

-- ---------------------------------------------------------------------------
-- order_refund_events: append-only audit trail
-- ---------------------------------------------------------------------------
create table if not exists public.order_refund_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  payment_id uuid references public.payments (id) on delete set null,
  actor text not null check (actor in ('buyer', 'seller', 'admin', 'webhook', 'system')),
  action text not null,
  paymongo_refund_id text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_refund_events_order_id
  on public.order_refund_events (order_id, created_at desc);

alter table public.order_refund_events enable row level security;

-- Buyers/sellers read own order events via order relationship
drop policy if exists "order_refund_events_select_buyer" on public.order_refund_events;
create policy "order_refund_events_select_buyer"
  on public.order_refund_events
  for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_refund_events.order_id and o.buyer_id = auth.uid()
    )
  );

drop policy if exists "order_refund_events_select_seller" on public.order_refund_events;
create policy "order_refund_events_select_seller"
  on public.order_refund_events
  for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_refund_events.order_id and o.seller_user_id = auth.uid()
    )
  );

drop policy if exists "order_refund_events_select_admin" on public.order_refund_events;
create policy "order_refund_events_select_admin"
  on public.order_refund_events
  for select
  to authenticated
  using (exists (select 1 from public.admins a where a.id = auth.uid()));

-- No client inserts — service role only (omit insert policy for authenticated)

-- ---------------------------------------------------------------------------
-- disputes
-- ---------------------------------------------------------------------------
create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  buyer_id uuid not null references auth.users (id) on delete cascade,
  seller_user_id uuid not null references public.sellers (user_id) on delete restrict,
  reason text not null,
  description text,
  status text not null default 'open'
    check (status in ('open', 'under_review', 'resolved', 'closed')),
  opened_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolution_notes text,
  attachment_paths text[] default '{}'::text[]
);

drop trigger if exists trg_disputes_updated_at on public.disputes;
create trigger trg_disputes_updated_at
  before update on public.disputes
  for each row execute function public.set_updated_at();

create index if not exists idx_disputes_order_id on public.disputes (order_id);
create index if not exists idx_disputes_buyer_id on public.disputes (buyer_id);
create index if not exists idx_disputes_seller_user_id on public.disputes (seller_user_id);
create index if not exists idx_disputes_status on public.disputes (status);

alter table public.disputes enable row level security;

drop policy if exists "disputes_buyer_select_own" on public.disputes;
create policy "disputes_buyer_select_own"
  on public.disputes for select to authenticated
  using (buyer_id = auth.uid());

drop policy if exists "disputes_buyer_insert_own" on public.disputes;
create policy "disputes_buyer_insert_own"
  on public.disputes for insert to authenticated
  with check (buyer_id = auth.uid());

drop policy if exists "disputes_seller_select_related" on public.disputes;
create policy "disputes_seller_select_related"
  on public.disputes for select to authenticated
  using (seller_user_id = auth.uid());

drop policy if exists "disputes_admin_all" on public.disputes;
create policy "disputes_admin_all"
  on public.disputes for all to authenticated
  using (exists (select 1 from public.admins a where a.id = auth.uid()))
  with check (exists (select 1 from public.admins a where a.id = auth.uid()));

-- ---------------------------------------------------------------------------
-- user_notifications (in-app feed; written by server routes with service role)
-- ---------------------------------------------------------------------------
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint user_notifications_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists idx_user_notifications_user_created
  on public.user_notifications (user_id, created_at desc);

alter table public.user_notifications enable row level security;

drop policy if exists "user_notifications_select_own" on public.user_notifications;
create policy "user_notifications_select_own"
  on public.user_notifications for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "user_notifications_update_own" on public.user_notifications;
create policy "user_notifications_update_own"
  on public.user_notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
