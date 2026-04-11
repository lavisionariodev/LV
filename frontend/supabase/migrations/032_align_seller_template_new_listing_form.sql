-- Align seller_form_templates with the seller "Add new listing" field set (NewListingClient).
-- Extend get_active_shop_listings to resolve area from dynamic_values.coverage as well as legacy location.

update public.seller_form_templates
set
  fields = '[
    {"id":"listing_name","order":0,"type":"text","label":"Listing name","required":true,"placeholder":"e.g. Memorial package — standard"},
    {"id":"description","order":1,"type":"textarea","label":"Description","required":false,"placeholder":"Describe what this listing offers"},
    {"id":"kind","order":2,"type":"select","label":"Kind","required":false,"options":["service","package"],"placeholder":"Select kind"},
    {"id":"category","order":3,"type":"text","label":"Category","required":false,"placeholder":"e.g. Memorial service"},
    {"id":"duration","order":4,"type":"text","label":"Duration","required":false,"placeholder":"e.g. 3–5 days"},
    {"id":"coverage","order":5,"type":"text","label":"Coverage","required":false,"placeholder":"e.g. Metro Manila (service area)"},
    {"id":"base_price","order":6,"type":"number","label":"Starting price (PHP)","required":true,"placeholder":"0"},
    {"id":"price_note","order":7,"type":"text","label":"Price note","required":false,"placeholder":"e.g. Indicative; extras billed separately"},
    {"id":"package_options","order":8,"type":"textarea","label":"Package options","required":false,"placeholder":"One option per line (buyer-facing labels)"},
    {"id":"inclusions","order":9,"type":"textarea","label":"What''s included","required":false,"placeholder":"One line per item"},
    {"id":"who_this_is_for","order":10,"type":"textarea","label":"Who this is for","required":false,"placeholder":"Describe the intended audience"},
    {"id":"important_notes","order":11,"type":"textarea","label":"Important notes","required":false,"placeholder":"Policies, disclaimers, or extra charges"}
  ]'::jsonb,
  updated_at = now()
where template_key = 'seller_new_listing';

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
    s.registered_at as seller_registered_at,
    s.business_started_at as seller_business_started_at,
    coalesce(s.package_options, '[]'::jsonb) as seller_package_options
  from public.seller_listings sl
  inner join public.sellers s on s.user_id = sl.seller_user_id
  where sl.status = 'active'
    and s.status in ('active', 'pending');
$$;

revoke all on function public.get_active_shop_listings() from public;
grant execute on function public.get_active_shop_listings() to anon, authenticated;
