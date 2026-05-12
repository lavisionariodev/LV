-- Adds a status column to public.users so admins can suspend / reactivate buyers.
-- Sellers have their own moderation pipeline; this column targets buyer accounts.

alter table public.users
  add column if not exists status text not null default 'active'
    check (status in ('active', 'suspended'));

create index if not exists idx_users_status on public.users (status);

comment on column public.users.status is
  'Account status: active or suspended. Used by admin buyers page for moderation. Sellers have a separate moderation pipeline.';

-- Admins should be able to update buyer status; this complements policy 016_admin_read_users_and_profiles.
drop policy if exists "Admins can update users" on public.users;
create policy "Admins can update users"
  on public.users
  for update
  to authenticated
  using (exists (select 1 from public.admins a where a.id = auth.uid()))
  with check (exists (select 1 from public.admins a where a.id = auth.uid()));
