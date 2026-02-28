-- Use full_name from OAuth providers (e.g. Google sends "name" or "full_name" in raw_user_meta_data).
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

  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, display_name);

  insert into public.users (id, email, role)
  values (new.id, new.email, user_role);

  return new;
end;
$$ language plpgsql security definer
   set search_path = public;
