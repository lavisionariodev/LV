-- Create unified users table for buyers and sellers

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('buyer', 'seller')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.users enable row level security;

create policy "Users can read own user row"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can insert own user row"
  on public.users for insert
  with check (auth.uid() = id);

create policy "Users can update own user row"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Seed existing non-admin accounts as buyers.
-- This assumes admins are explicitly listed in public.admins.

insert into public.users (id, email, role)
select u.id, u.email, 'buyer'
from auth.users u
left join public.admins a on a.id = u.id
where a.id is null
on conflict (id) do nothing;

