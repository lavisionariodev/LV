-- Storage setup for seller listing images

do $$
begin
  if not exists (
    select 1 from storage.buckets where id = 'listing-images'
  ) then
    perform storage.create_bucket('listing-images', true);
  end if;
end;
$$ language plpgsql;

alter table storage.objects enable row level security;

drop policy if exists "Public can read listing images" on storage.objects;
create policy "Public can read listing images"
  on storage.objects
  for select
  using (bucket_id = 'listing-images');

drop policy if exists "Sellers manage own listing images" on storage.objects;
create policy "Sellers manage own listing images"
  on storage.objects
  for all
  using (
    bucket_id = 'listing-images'
    and auth.uid()::text = split_part(name, '/', 1)
  )
  with check (
    bucket_id = 'listing-images'
    and auth.uid()::text = split_part(name, '/', 1)
  );
