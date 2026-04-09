-- Public shop: expose active marketplace listings via SECURITY DEFINER RPC
-- (avoids widening RLS on sellers / seller_listings for PII)

CREATE OR REPLACE FUNCTION public.get_active_shop_listings()
RETURNS TABLE (
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
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sl.id,
    sl.listing_name,
    sl.base_price,
    sl.image_urls,
    sl.dynamic_values,
    COALESCE(
      NULLIF(trim(sl.location), ''),
      NULLIF(trim(sl.dynamic_values->>'location'), ''),
      ''
    ) AS listing_location,
    s.user_id,
    COALESCE(NULLIF(trim(s.business_name), ''), 'Verified seller') AS business_name,
    COALESCE(
      NULLIF(trim(s.address), ''),
      NULLIF(trim(sl.location), ''),
      NULLIF(trim(sl.dynamic_values->>'location'), ''),
      ''
    ) AS business_location,
    COALESCE(
      NULLIF(trim(sl.dynamic_values->>'funeral_category'), ''),
      NULLIF(trim(sl.category), ''),
      'memorial-planning'
    ) AS public_category_slug,
    sl.created_at
  FROM public.seller_listings sl
  INNER JOIN public.sellers s ON s.user_id = sl.seller_user_id
  WHERE sl.status = 'active'
    AND s.status = 'active';
$$;

REVOKE ALL ON FUNCTION public.get_active_shop_listings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_shop_listings() TO anon, authenticated;
