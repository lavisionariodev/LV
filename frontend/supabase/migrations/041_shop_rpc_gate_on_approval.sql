-- Tighten shop visibility rules:
-- - listing must be Active AND Approved
-- - seller account must be Active
--
-- This function is SECURITY DEFINER so the shop can read without widening table RLS.

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
  seller_business_started_at timestamptz,
  seller_package_options jsonb
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
      nullif(trim(sl.dynamic_values->>'coverage'), ''),
      nullif(trim(sl.dynamic_values->>'location'), ''),
      ''
    ) as listing_location,
    s.user_id,
    coalesce(nullif(trim(s.business_name), ''), 'Verified seller') as business_name,
    coalesce(
      nullif(trim(s.address), ''),
      nullif(trim(sl.location), ''),
      nullif(trim(sl.dynamic_values->>'coverage'), ''),
      nullif(trim(sl.dynamic_values->>'location'), ''),
      ''
    ) as business_location,
    coalesce(
      nullif(trim(sl.dynamic_values->>'funeral_category'), ''),
      nullif(trim(sl.category), ''),
      nullif(trim(sl.dynamic_values->>'category'), ''),
      'memorial-planning'
    ) as public_category_slug,
    sl.created_at,
    coalesce(s.registered_at, sl.created_at) as seller_registered_at,
    s.business_started_at as seller_business_started_at,
    coalesce(
      case
        when sl.dynamic_values ? 'package_options'
          and jsonb_typeof(sl.dynamic_values->'package_options') = 'array'
          and coalesce(jsonb_array_length(sl.dynamic_values->'package_options'), 0) > 0
        then sl.dynamic_values->'package_options'
        else null
      end,
      coalesce(s.package_options, '[]'::jsonb)
    ) as seller_package_options
  from public.seller_listings sl
  inner join public.sellers s on s.user_id = sl.seller_user_id
  where sl.status = 'active'
    and sl.approval_status = 'approved'
    and s.status = 'active';
$$;

revoke all on function public.get_active_shop_listings() from public;
grant execute on function public.get_active_shop_listings() to anon, authenticated;

comment on function public.get_active_shop_listings() is
  'SECURITY DEFINER: returns public shop listings. Requires sellers.status=active, seller_listings.status=active, and seller_listings.approval_status=approved. '
  'seller_package_options prefers listing dynamic_values.package_options when non-empty, else sellers.package_options.';

