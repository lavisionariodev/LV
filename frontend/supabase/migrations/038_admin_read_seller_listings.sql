-- Allow authenticated admins to read all seller listings (admin portal catalog view).
-- Sellers retain existing policies for their own rows; this adds a separate SELECT path for admins.

drop policy if exists "Admins can read all seller listings" on public.seller_listings;

create policy "Admins can read all seller listings"
on public.seller_listings
for select
to authenticated
using (
  exists (select 1 from public.admins a where a.id = auth.uid())
);
