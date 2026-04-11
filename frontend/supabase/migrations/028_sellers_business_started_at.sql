-- Business operations start (In Service / tenure) vs website signup (registered_at / Joined).

alter table public.sellers
  add column if not exists business_started_at timestamptz null;

comment on column public.sellers.registered_at is 'When the seller joined this marketplace (website signup).';
comment on column public.sellers.business_started_at is 'When the funeral business began operations (physical tenure).';

-- RPC: expose both timestamps for the shop provider card.
drop function if exists public.get_active_shop_listings();

create function public.get_active_shop_listings()
returns table (
  listing_id uuid,
  listing_name text,
  base_price numeric,
  image_urls text[],
  dynamic_values jsonb,
  listing_location text,
  seller_user_id uuid,
  business_name text,
  business_location text,
  public_category_slug text,
  created_at timestamptz,
  seller_registered_at timestamptz,
  seller_business_started_at timestamptz
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
    sl.dynamic_values,
    coalesce(
      nullif(trim(sl.location), ''),
      nullif(trim(sl.dynamic_values->>'location'), ''),
      ''
    ) as listing_location,
    s.user_id,
    coalesce(nullif(trim(s.business_name), ''), 'Verified seller') as business_name,
    coalesce(
      nullif(trim(s.address), ''),
      nullif(trim(sl.location), ''),
      nullif(trim(sl.dynamic_values->>'location'), ''),
      ''
    ) as business_location,
    coalesce(
      nullif(trim(sl.dynamic_values->>'funeral_category'), ''),
      nullif(trim(sl.category), ''),
      'memorial-planning'
    ) as public_category_slug,
    sl.created_at,
    s.registered_at as seller_registered_at,
    s.business_started_at as seller_business_started_at
  from public.seller_listings sl
  inner join public.sellers s on s.user_id = sl.seller_user_id
  where sl.status = 'active'
    and s.status in ('active', 'pending');
$$;

revoke all on function public.get_active_shop_listings() from public;
grant execute on function public.get_active_shop_listings() to anon, authenticated;
