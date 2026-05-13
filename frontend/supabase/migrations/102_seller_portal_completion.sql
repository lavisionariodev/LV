-- Seller portal completion: notification prefs, support history, payout requests, CMS help FAQ.

alter table public.sellers
  add column if not exists notification_preferences jsonb not null default '{}'::jsonb;

comment on column public.sellers.notification_preferences is
  'Seller notification channel preferences by bucket (order, payment, listing, alert, system).';

alter table public.site_content
  add column if not exists seller_help_faq jsonb not null default '[]'::jsonb;

comment on column public.site_content.seller_help_faq is
  'CMS-managed seller help FAQ entries grouped by category tab.';

create table if not exists public.seller_support_requests (
  id uuid primary key default gen_random_uuid(),
  seller_user_id uuid not null references auth.users (id) on delete cascade,
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  admin_notification_id uuid null,
  created_at timestamptz not null default now()
);

create index if not exists idx_seller_support_requests_seller_created
  on public.seller_support_requests (seller_user_id, created_at desc);

alter table public.seller_support_requests enable row level security;

drop policy if exists "seller_support_requests_select_own" on public.seller_support_requests;
create policy "seller_support_requests_select_own"
  on public.seller_support_requests for select to authenticated
  using (seller_user_id = auth.uid());

drop policy if exists "seller_support_requests_insert_own" on public.seller_support_requests;
create policy "seller_support_requests_insert_own"
  on public.seller_support_requests for insert to authenticated
  with check (seller_user_id = auth.uid());

create table if not exists public.seller_payout_requests (
  id uuid primary key default gen_random_uuid(),
  seller_user_id uuid not null references auth.users (id) on delete cascade,
  requested_amount numeric null,
  note text null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  escrow_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_seller_payout_requests_seller_created
  on public.seller_payout_requests (seller_user_id, created_at desc);

alter table public.seller_payout_requests enable row level security;

drop policy if exists "seller_payout_requests_select_own" on public.seller_payout_requests;
create policy "seller_payout_requests_select_own"
  on public.seller_payout_requests for select to authenticated
  using (seller_user_id = auth.uid());

drop policy if exists "seller_payout_requests_insert_own" on public.seller_payout_requests;
create policy "seller_payout_requests_insert_own"
  on public.seller_payout_requests for insert to authenticated
  with check (seller_user_id = auth.uid());
