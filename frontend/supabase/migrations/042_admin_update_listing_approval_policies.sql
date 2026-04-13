-- Admins should be able to approve/reject listings.
-- This adds an UPDATE path for authenticated admins (separate from seller's own update policy).

drop policy if exists "Admins can update all seller listings" on public.seller_listings;

create policy "Admins can update all seller listings"
on public.seller_listings
for update
to authenticated
using (
  exists (select 1 from public.admins a where a.id = auth.uid())
)
with check (
  exists (select 1 from public.admins a where a.id = auth.uid())
);

