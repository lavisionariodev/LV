-- Secure site_content writes: admin-only.
-- Keeps public reads for navbar/footer and public pages.

alter table public.site_content enable row level security;

-- Public read is allowed.
drop policy if exists "Public can read site content" on public.site_content;
create policy "Public can read site content"
  on public.site_content
  for select
  using (true);

-- Remove overly-broad write policy (was allowing any authenticated user).
drop policy if exists "Authenticated can upsert site content" on public.site_content;

-- Admin-only write policies.
drop policy if exists "Admins can insert site content" on public.site_content;
create policy "Admins can insert site content"
  on public.site_content
  for insert
  to authenticated
  with check (
    exists (select 1 from public.admins a where a.id = auth.uid())
  );

drop policy if exists "Admins can update site content" on public.site_content;
create policy "Admins can update site content"
  on public.site_content
  for update
  to authenticated
  using (
    exists (select 1 from public.admins a where a.id = auth.uid())
  )
  with check (
    exists (select 1 from public.admins a where a.id = auth.uid())
  );

drop policy if exists "Admins can delete site content" on public.site_content;
create policy "Admins can delete site content"
  on public.site_content
  for delete
  to authenticated
  using (
    exists (select 1 from public.admins a where a.id = auth.uid())
  );

