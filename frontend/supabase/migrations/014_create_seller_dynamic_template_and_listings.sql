-- Global admin-defined seller form template + seller listing submissions

create extension if not exists pgcrypto;

create table if not exists public.seller_form_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique default 'seller_new_listing',
  title text not null default 'Seller New Listing Form',
  fields jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_by uuid null references auth.users(id) on delete set null,
  updated_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_form_templates_fields_array check (jsonb_typeof(fields) = 'array')
);

create table if not exists public.seller_listings (
  id uuid primary key default gen_random_uuid(),
  seller_user_id uuid not null references public.sellers(user_id) on delete cascade,
  template_id uuid null references public.seller_form_templates(id) on delete set null,
  listing_name text not null,
  category text null,
  base_price numeric(12,2) null,
  location text null,
  status text not null default 'draft' check (status in ('draft', 'active', 'inactive', 'archived')),
  dynamic_values jsonb not null default '{}'::jsonb,
  image_urls text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_listings_dynamic_values_object check (jsonb_typeof(dynamic_values) = 'object')
);

create index if not exists idx_seller_form_templates_active
  on public.seller_form_templates (is_active);

create index if not exists idx_seller_listings_seller_user_id
  on public.seller_listings (seller_user_id);

create index if not exists idx_seller_listings_status
  on public.seller_listings (status);

create index if not exists idx_seller_listings_dynamic_values_gin
  on public.seller_listings using gin (dynamic_values);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_seller_form_templates_updated_at on public.seller_form_templates;
create trigger trg_seller_form_templates_updated_at
before update on public.seller_form_templates
for each row execute function public.set_updated_at();

drop trigger if exists trg_seller_listings_updated_at on public.seller_listings;
create trigger trg_seller_listings_updated_at
before update on public.seller_listings
for each row execute function public.set_updated_at();

insert into public.seller_form_templates (template_key, title, fields, is_active)
values (
  'seller_new_listing',
  'Seller New Listing Form',
  '[
    {"id":"listing_name","type":"text","label":"Listing name","required":true,"placeholder":"e.g. Wedding Photography"},
    {"id":"category","type":"select","label":"Category","required":true,"options":["service","package","product","other"]},
    {"id":"base_price","type":"number","label":"Starting price","required":true,"min":0,"step":0.01},
    {"id":"location","type":"text","label":"Location","required":false},
    {"id":"status","type":"select","label":"Status","required":true,"options":["active","inactive"],"placeholder":"Select status"},
    {"id":"description","type":"textarea","label":"Description","required":false,"maxLength":2000}
  ]'::jsonb,
  true
)
on conflict (template_key) do nothing;

alter table public.seller_form_templates enable row level security;
alter table public.seller_listings enable row level security;

drop policy if exists "read_active_seller_form_templates" on public.seller_form_templates;
create policy "read_active_seller_form_templates"
on public.seller_form_templates
for select
to authenticated
using (is_active = true);

drop policy if exists "admin_manage_seller_form_templates" on public.seller_form_templates;
create policy "admin_manage_seller_form_templates"
on public.seller_form_templates
for all
to authenticated
using (
  exists (
    select 1
    from public.admins a
    where a.id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.admins a
    where a.id = auth.uid()
  )
);

drop policy if exists "seller_read_own_listings" on public.seller_listings;
create policy "seller_read_own_listings"
on public.seller_listings
for select
to authenticated
using (seller_user_id = auth.uid());

drop policy if exists "seller_insert_own_listings" on public.seller_listings;
create policy "seller_insert_own_listings"
on public.seller_listings
for insert
to authenticated
with check (seller_user_id = auth.uid());

drop policy if exists "seller_update_own_listings" on public.seller_listings;
create policy "seller_update_own_listings"
on public.seller_listings
for update
to authenticated
using (seller_user_id = auth.uid())
with check (seller_user_id = auth.uid());

drop policy if exists "seller_delete_own_listings" on public.seller_listings;
create policy "seller_delete_own_listings"
on public.seller_listings
for delete
to authenticated
using (seller_user_id = auth.uid());
