-- Public seller storefront fields without requiring seller_listings rows.
-- Used by /seller-profile when a seller is active but has no approved active listings yet.

create or replace function public.get_public_seller_profile(p_seller_user_id uuid)
returns table (
  seller_user_id uuid,
  business_name text,
  business_location text,
  seller_username text,
  seller_business_info text,
  seller_tagline text,
  seller_specialties text[],
  seller_avatar_url text,
  seller_registered_at timestamptz,
  seller_business_started_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.user_id,
    coalesce(nullif(trim(s.business_name), ''), 'Verified seller') as business_name,
    coalesce(nullif(trim(s.address), ''), '') as business_location,
    nullif(lower(trim(coalesce(s.username, ''))), '') as seller_username,
    nullif(trim(coalesce(s.business_info, '')), '') as seller_business_info,
    nullif(trim(coalesce(s.tagline, '')), '') as seller_tagline,
    coalesce(s.specialties, '{}'::text[]) as seller_specialties,
    nullif(trim(coalesce(p.avatar_url, '')), '') as seller_avatar_url,
    coalesce(s.registered_at, s.updated_at) as seller_registered_at,
    s.business_started_at as seller_business_started_at
  from public.sellers s
  left join public.profiles p on p.id = s.user_id
  where s.user_id = p_seller_user_id
    and s.status = 'active';
$$;

revoke all on function public.get_public_seller_profile(uuid) from public;
grant execute on function public.get_public_seller_profile(uuid) to anon, authenticated;

comment on function public.get_public_seller_profile(uuid) is
  'SECURITY DEFINER: storefront seller row for /seller-profile when there are no shop listing rows; active sellers only.';
