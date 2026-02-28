-- Link profiles to users with an explicit foreign key.
-- 1. Backfill users so every profile has a matching user row.
-- 2. Make profiles.id reference users(id) instead of auth.users(id).
-- 3. Trigger must insert users first, then profiles (so FK is satisfied).

-- Backfill: ensure every profile has a corresponding users row
insert into public.users (id, email, role)
select p.id, p.email, 'buyer'
from public.profiles p
left join public.users u on u.id = p.id
where u.id is null
on conflict (id) do nothing;

-- Drop FK to auth.users and add FK to users (constraint name may vary; drop by dependency)
alter table public.profiles
  drop constraint if exists profiles_id_fkey;

alter table public.profiles
  add constraint profiles_id_fkey
  foreign key (id) references public.users(id) on delete cascade;

-- Trigger must insert into users first, then profiles (profiles references users)
create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_role text;
  display_name text;
begin
  user_role := coalesce(new.raw_user_meta_data->>'role', 'buyer');
  if user_role not in ('buyer', 'seller') then
    user_role := 'buyer';
  end if;

  display_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    ''
  );

  insert into public.users (id, email, role)
  values (new.id, new.email, user_role);

  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, display_name);

  return new;
end;
$$ language plpgsql security definer
   set search_path = public;
