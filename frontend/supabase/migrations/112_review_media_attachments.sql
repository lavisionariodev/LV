-- Optional image/video attachments on buyer order-item reviews.

alter table public.order_item_reviews
  add column if not exists image_urls text[] not null default '{}',
  add column if not exists video_urls text[] not null default '{}';

-- Storage bucket for review media (public read for shop/seller/profile display).

do $$
begin
  if not exists (select 1 from storage.buckets where id = 'review-media') then
    begin
      perform storage.create_bucket('review-media', true);
    exception when others then
      -- Supabase projects without storage.create_bucket(text, boolean): direct insert.
      insert into storage.buckets (id, name, public)
      values ('review-media', 'review-media', true)
      on conflict (id) do nothing;
    end;
  end if;
end$$;

-- storage.objects is owned by Supabase; do not ALTER it here (RLS is already enabled).
-- Uploads use the service role in API routes. Policies below are for direct client access.

do $$
begin
  drop policy if exists "Public can read review media" on storage.objects;
  create policy "Public can read review media"
    on storage.objects
    for select
    using (bucket_id = 'review-media');

  drop policy if exists "Buyers manage own review media" on storage.objects;
  create policy "Buyers manage own review media"
    on storage.objects
    for all
    to authenticated
    using (
      bucket_id = 'review-media'
      and auth.uid()::text = split_part(name, '/', 1)
    )
    with check (
      bucket_id = 'review-media'
      and auth.uid()::text = split_part(name, '/', 1)
    );
exception
  when insufficient_privilege then
    raise notice 'Skipping storage.objects policies (insufficient privilege). '
      'Create them in Dashboard → Storage → review-media → Policies, or run this block as postgres.';
  when others then
    raise notice 'Skipping storage.objects policies: %', sqlerrm;
end$$;
