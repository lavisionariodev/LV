-- Admin avatar support for admins table and Supabase Storage.
-- Run this in Supabase Dashboard → SQL Editor (or via `supabase db push`).

-- 1) Add avatar_url column to admins
alter table public.admins
  add column if not exists avatar_url text;

comment on column public.admins.avatar_url is
  'Path of admin avatar file in the avatars storage bucket.';

-- Ensure row level security remains enabled on admins
alter table public.admins enable row level security;

-- Allow admins to update only their own row
create policy "Admins can update self"
  on public.admins
  for update
  using (auth.uid() = id) 
  with check (auth.uid() = id);


-- 2) Create avatars storage bucket (public read)
do $$
begin
  if not exists (
    select 1 from storage.buckets where id = 'avatars'
  ) then
    -- Some projects expose create_bucket(id text, is_public boolean).
    -- Use positional arguments for maximum compatibility.
    perform storage.create_bucket('avatars', true);
  end if;
end;
$$ language plpgsql;


-- 3) Storage RLS policies for avatars bucket
alter table storage.objects enable row level security;

-- Anyone can read avatar files
create policy "Public can read avatars" 
  on storage.objects
  for select  
  using (bucket_id = 'avatars');

-- Only the authenticated user can insert/update/delete objects
-- in their own folder: avatars/<auth.uid()>/...
create policy "Admins manage own avatar"
  on storage.objects
  for all
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = split_part(name, '/', 1)
  )
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = split_part(name, '/', 1)
  );

