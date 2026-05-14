-- Buyer notification preferences on profiles + persisted admin commission change log.

alter table public.profiles
  add column if not exists notification_preferences jsonb not null default '{}'::jsonb;

comment on column public.profiles.notification_preferences is
  'Buyer in-app/email notification bucket toggles (service, payment, reminder, account).';

create table if not exists public.platform_commission_change_log (
  id uuid primary key default gen_random_uuid(),
  changed_by uuid references auth.users (id) on delete set null,
  scope text not null check (scope in ('global', 'seller_override', 'order_escrow')),
  seller_user_id uuid references auth.users (id) on delete set null,
  order_id uuid references public.orders (id) on delete set null,
  label text not null,
  from_percent numeric(6, 2),
  to_percent numeric(6, 2),
  created_at timestamptz not null default now()
);

create index if not exists idx_platform_commission_change_log_created
  on public.platform_commission_change_log (created_at desc);

alter table public.platform_commission_change_log enable row level security;

comment on table public.platform_commission_change_log is
  'Audit trail for platform default, seller override, and per-order escrow commission edits.';
