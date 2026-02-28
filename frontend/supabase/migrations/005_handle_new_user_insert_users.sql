-- Ensure new auth users get a row in both profiles and users.
-- Role comes from signUp options.data.role (e.g. 'buyer'); default 'buyer'.
-- This runs in the database with security definer, so RLS does not block the insert.

create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_role text;
begin
  user_role := coalesce(new.raw_user_meta_data->>'role', 'buyer');
  if user_role not in ('buyer', 'seller') then
    user_role := 'buyer';
  end if;

  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));

  insert into public.users (id, email, role)
  values (new.id, new.email, user_role);

  return new;
end;
$$ language plpgsql security definer;

-- Backfill: ensure every profile has a users row (for accounts created before this migration)
insert into public.users (id, email, role)
select p.id, p.email, 'buyer'
from public.profiles p
left join public.users u on u.id = p.id
where u.id is null
on conflict (id) do nothing;
