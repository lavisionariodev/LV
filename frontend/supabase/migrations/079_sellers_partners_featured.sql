-- Admin-curated spotlight on /partners: only admins may set/unset partners_featured.
alter table public.sellers
  add column if not exists partners_featured boolean not null default false;

comment on column public.sellers.partners_featured is
  'When true, seller may appear in the partners page spotlight (admin-only).';

create index if not exists sellers_partners_featured_true_idx
  on public.sellers (user_id)
  where partners_featured = true;

-- Sellers may not toggle spotlight; admins can (existing "Admins can update all seller data" policy).
create or replace function public.sellers_enforce_partners_featured_acl()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
begin
  select exists (select 1 from public.admins a where a.id = auth.uid()) into is_admin;

  if tg_op = 'INSERT' then
    if not is_admin then
      new.partners_featured := false;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and not is_admin then
    new.partners_featured := old.partners_featured;
  end if;

  return new;
end;
$$;

drop trigger if exists sellers_enforce_partners_featured_acl on public.sellers;

create trigger sellers_enforce_partners_featured_acl
before insert or update on public.sellers
for each row execute function public.sellers_enforce_partners_featured_acl();
