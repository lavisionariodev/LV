-- /partners: all sellers except suspended (aligned with migration 077 when applied).
create or replace function public.get_active_partners_directory()
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
  'SECURITY DEFINER: /partners — all sellers rows except suspended (see 077 for re-grants).';
