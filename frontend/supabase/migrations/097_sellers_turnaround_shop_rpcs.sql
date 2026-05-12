-- Typical response / service lead time for buyer-facing storefront (e.g. "Within 24 hours").
alter table public.sellers
  add column if not exists turnaround text;

comment on column public.sellers.turnaround is
  'Optional buyer-facing lead time or response window (plain text, e.g. "Same day", "1–2 business days").';

-- Shop listings RPC: expose seller approval status + turnaround for storefront UIs.
drop function if exists public.get_active_shop_listings();

create function public.get_active_shop_listings()
returns table (
  listing_id uuid,
  listing_name text,
  base_price numeric,
  image_urls text[],
  listing_location text,
  seller_user_id uuid,
  business_name text,
  business_location text,
  seller_avatar_url text,
  seller_username text,
  seller_business_info text,
  seller_tagline text,
  seller_specialties text[],
  seller_social_links jsonb,
  public_category_slug text,
  created_at timestamptz,
  seller_registered_at timestamptz,
  seller_business_started_at timestamptz,
  seller_package_options jsonb,
  description text,
  duration text,
  listing_kind text,
  listing_category text,
  funeral_category text,
  stock_status text,
  inclusions text,
  who_this_is_for text,
  important_notes text,
  seller_status text,
  seller_turnaround text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    sl.id,
    sl.listing_name,
    sl.base_price,
    sl.image_urls,
    coalesce(nullif(trim(sl.location), ''), '') as listing_location,
    s.user_id,
    coalesce(nullif(trim(s.business_name), ''), 'Verified seller') as business_name,
    coalesce(
      nullif(trim(s.address), ''),
      nullif(trim(sl.location), ''),
      ''
    ) as business_location,
    nullif(trim(coalesce(p.avatar_url, '')), '') as seller_avatar_url,
    nullif(lower(trim(coalesce(s.username, ''))), '') as seller_username,
    nullif(trim(coalesce(s.business_info, '')), '') as seller_business_info,
    nullif(trim(coalesce(s.tagline, '')), '') as seller_tagline,
    coalesce(s.specialties, '{}'::text[]) as seller_specialties,
    coalesce(s.social_links, '{}'::jsonb) as seller_social_links,
    coalesce(
      nullif(trim(sl.funeral_category), ''),
      nullif(trim(sl.category), ''),
      'memorial-planning'
    ) as public_category_slug,
    sl.created_at,
    coalesce(s.registered_at, sl.created_at) as seller_registered_at,
    s.business_started_at as seller_business_started_at,
    coalesce(
      case
        when jsonb_typeof(sl.package_options) = 'array'
          and coalesce(jsonb_array_length(sl.package_options), 0) > 0
        then sl.package_options
        else null
      end,
      coalesce(s.package_options, '[]'::jsonb)
    ) as seller_package_options,
    sl.description,
    sl.duration,
    sl.listing_kind,
    sl.category,
    sl.funeral_category,
    sl.stock_status,
    sl.inclusions,
    sl.who_this_is_for,
    sl.important_notes,
    s.status as seller_status,
    nullif(trim(coalesce(s.turnaround, '')), '') as seller_turnaround
  from public.seller_listings sl
  inner join public.sellers s on s.user_id = sl.seller_user_id
  left join public.profiles p on p.id = s.user_id
  where sl.status = 'active'
    and sl.approval_status = 'approved'
    and s.status = 'active';
$$;

revoke all on function public.get_active_shop_listings() from public;
grant execute on function public.get_active_shop_listings() to anon, authenticated;

comment on function public.get_active_shop_listings() is
  'SECURITY DEFINER: public shop listings; includes seller_status, seller_turnaround, social links, and storefront fields.';

-- Public seller profile (no listing rows): same extensions.
drop function if exists public.get_public_seller_profile(uuid);

create function public.get_public_seller_profile(p_seller_user_id uuid)
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
  seller_business_started_at timestamptz,
  seller_social_links jsonb,
  seller_status text,
  seller_turnaround text
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
    s.business_started_at as seller_business_started_at,
    coalesce(s.social_links, '{}'::jsonb) as seller_social_links,
    s.status as seller_status,
    nullif(trim(coalesce(s.turnaround, '')), '') as seller_turnaround
  from public.sellers s
  left join public.profiles p on p.id = s.user_id
  where s.user_id = p_seller_user_id
    and s.status = 'active';
$$;

revoke all on function public.get_public_seller_profile(uuid) from public;
grant execute on function public.get_public_seller_profile(uuid) to anon, authenticated;

comment on function public.get_public_seller_profile(uuid) is
  'SECURITY DEFINER: storefront seller row when there are no shop listing rows; active sellers only; includes status, turnaround, social_links.';
