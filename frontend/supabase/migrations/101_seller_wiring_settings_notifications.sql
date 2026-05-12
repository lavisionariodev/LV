-- Seller portal wiring: persistent notification resolution, payout settings, and compliance documents.

alter table public.user_notifications
  add column if not exists resolved_at timestamptz;

comment on column public.user_notifications.resolved_at is
  'When the recipient marked this notification/action item resolved. NULL means unresolved.';

create index if not exists idx_user_notifications_user_resolved
  on public.user_notifications (user_id, resolved_at, created_at desc);

-- Keep notification read/resolve/delete operations self-contained for this feature.
drop policy if exists "user_notifications_update_own" on public.user_notifications;
create policy "user_notifications_update_own"
  on public.user_notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "user_notifications_delete_own" on public.user_notifications;
create policy "user_notifications_delete_own"
  on public.user_notifications for delete to authenticated
  using (user_id = auth.uid());

create table if not exists public.seller_payout_settings (
  seller_user_id uuid primary key references public.sellers (user_id) on delete cascade,
  payout_method text not null default 'bank'
    check (payout_method in ('bank', 'gcash', 'manual')),
  account_holder_name text,
  bank_name text,
  account_number text,
  gcash_name text,
  gcash_number text,
  payout_email text,
  notes text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

drop trigger if exists trg_seller_payout_settings_updated_at on public.seller_payout_settings;
create trigger trg_seller_payout_settings_updated_at
before update on public.seller_payout_settings
for each row execute function public.set_updated_at();

alter table public.seller_payout_settings enable row level security;

drop policy if exists "seller_payout_settings_select_own" on public.seller_payout_settings;
create policy "seller_payout_settings_select_own"
  on public.seller_payout_settings for select to authenticated
  using (seller_user_id = auth.uid());

drop policy if exists "seller_payout_settings_insert_own" on public.seller_payout_settings;
create policy "seller_payout_settings_insert_own"
  on public.seller_payout_settings for insert to authenticated
  with check (seller_user_id = auth.uid());

drop policy if exists "seller_payout_settings_update_own" on public.seller_payout_settings;
create policy "seller_payout_settings_update_own"
  on public.seller_payout_settings for update to authenticated
  using (seller_user_id = auth.uid())
  with check (seller_user_id = auth.uid());

drop policy if exists "seller_payout_settings_admin_all" on public.seller_payout_settings;
create policy "seller_payout_settings_admin_all"
  on public.seller_payout_settings for all to authenticated
  using (exists (select 1 from public.admins a where a.id = auth.uid()))
  with check (exists (select 1 from public.admins a where a.id = auth.uid()));

create table if not exists public.seller_documents (
  id uuid primary key default gen_random_uuid(),
  seller_user_id uuid not null references public.sellers (user_id) on delete cascade,
  document_type text not null default 'business_permit',
  display_name text not null,
  storage_bucket text not null default 'seller-documents',
  storage_path text not null,
  mime_type text,
  file_size bigint,
  status text not null default 'submitted'
    check (status in ('submitted', 'approved', 'rejected')),
  rejection_reason text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_documents_path_unique unique (storage_bucket, storage_path)
);

create index if not exists idx_seller_documents_seller_created
  on public.seller_documents (seller_user_id, created_at desc);

drop trigger if exists trg_seller_documents_updated_at on public.seller_documents;
create trigger trg_seller_documents_updated_at
before update on public.seller_documents
for each row execute function public.set_updated_at();

alter table public.seller_documents enable row level security;

drop policy if exists "seller_documents_select_own" on public.seller_documents;
create policy "seller_documents_select_own"
  on public.seller_documents for select to authenticated
  using (seller_user_id = auth.uid());

drop policy if exists "seller_documents_insert_own" on public.seller_documents;
create policy "seller_documents_insert_own"
  on public.seller_documents for insert to authenticated
  with check (seller_user_id = auth.uid());

drop policy if exists "seller_documents_update_own_unreviewed" on public.seller_documents;
create policy "seller_documents_update_own_unreviewed"
  on public.seller_documents for update to authenticated
  using (seller_user_id = auth.uid() and status in ('submitted', 'rejected'))
  with check (seller_user_id = auth.uid());

drop policy if exists "seller_documents_delete_own_unreviewed" on public.seller_documents;
create policy "seller_documents_delete_own_unreviewed"
  on public.seller_documents for delete to authenticated
  using (seller_user_id = auth.uid() and status in ('submitted', 'rejected'));

drop policy if exists "seller_documents_admin_all" on public.seller_documents;
create policy "seller_documents_admin_all"
  on public.seller_documents for all to authenticated
  using (exists (select 1 from public.admins a where a.id = auth.uid()))
  with check (exists (select 1 from public.admins a where a.id = auth.uid()));

do $$
begin
  if not exists (select 1 from storage.buckets where id = 'seller-documents') then
    begin
      perform storage.create_bucket('seller-documents', false);
    exception when others then
      insert into storage.buckets (id, name, public)
      values ('seller-documents', 'seller-documents', false)
      on conflict (id) do nothing;
    end;
  end if;
end$$;
