-- Public-facing label for partner directory cards (distinct from listing category slug).
alter table public.sellers
  add column if not exists business_type_label text;

comment on column public.sellers.business_type_label is
  'Short public label for storefront / partner directory (e.g. Funeral services, Chapel, Florals).';

-- Active sellers directory for anon + authenticated reads (RLS stays closed on `sellers` for public).
drop function if exists public.get_active_partners_directory();

create function public.get_active_partners_directory()
returns table (
  seller_user_id uuid,
  business_name text,
  tagline text,
  business_type_label text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.user_id,
    coalesce(nullif(trim(s.business_name), ''), 'Verified seller') as business_name,
    nullif(trim(s.tagline), '') as tagline,
    nullif(trim(s.business_type_label), '') as business_type_label,
    nullif(trim(p.avatar_url), '') as avatar_url
  from public.sellers s
  left join public.profiles p on p.id = s.user_id
  where s.status is distinct from 'suspended'
  order by lower(coalesce(nullif(trim(s.business_name), ''), 'verified seller'));
$$;

comment on function public.get_active_partners_directory() is
  'SECURITY DEFINER: /partners — sellers except suspended; joins profiles.avatar_url.';

revoke all on function public.get_active_partners_directory() from public;
grant execute on function public.get_active_partners_directory() to anon, authenticated;
