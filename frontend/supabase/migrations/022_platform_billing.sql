-- Platform legal / settlement profile for marketplace billing (Phase B — wire UI when ready).
-- Run in Supabase Dashboard → SQL Editor (or via `supabase db push`).

create table if not exists public.platform_billing (
  id smallint primary key default 1 check (id = 1),
  legal_name text,
  address text,
  tax_id text,
  billing_email text,
  settlement_notes text,
  default_commission_percent numeric(5, 2),
  updated_at timestamptz not null default now()
);

comment on table public.platform_billing is
  'Singleton row (id=1): platform legal identity and settlement notes for invoicing; optional default commission mirror.';

alter table public.platform_billing enable row level security;

-- Admins may read the singleton billing profile
create policy "Admins can read platform billing"
  on public.platform_billing
  for select
  using (exists (select 1 from public.admins a where a.id = auth.uid()));

-- Admins may update the singleton (treasury / super-admin workflows can be tightened later)
create policy "Admins can update platform billing"
  on public.platform_billing
  for update
  using (exists (select 1 from public.admins a where a.id = auth.uid()))
  with check (exists (select 1 from public.admins a where a.id = auth.uid()));

insert into public.platform_billing (id) values (1)
  on conflict (id) do nothing;
