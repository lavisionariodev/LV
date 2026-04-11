-- =============================================================================
-- Seller domain: PostgreSQL comments for documentation + shop RPC touch-up
-- =============================================================================
-- Run once after 033. Does not replace earlier migrations (014–033 stay in history).
--
-- 1) COMMENT ON … — surfaces in Supabase Studio / introspection for future devs.
-- 2) get_active_shop_listings — restore seller_registered_at = coalesce(
--    sellers.registered_at, seller_listings.created_at) as in migration 027, so
--    "Joined" / tenure UIs still work when registered_at is null on legacy rows.
-- =============================================================================

-- --- seller_form_templates ----------------------------------------------------

comment on table public.seller_form_templates is
  'Single active row per template_key (e.g. seller_new_listing). Admin-editable JSON: '
  'fields[] = dynamic form for seller listing create/edit; section_config = wizard '
  'section titles and tips (basic / sales / others). Consumed by seller UI and admin template builder.';

comment on column public.seller_form_templates.template_key is
  'Unique key; app uses seller_new_listing for the Add listing / products flows.';

comment on column public.seller_form_templates.fields is
  'JSON array of field defs: id, order, section, type, label, required, placeholder, '
  'options, sublabel. Maps to seller_listings.dynamic_values keys.';

comment on column public.seller_form_templates.section_config is
  'JSON { "sections": [ { id, label, tipTitle, tipBody, shopGuide } ] } per basic/sales/others.';

comment on column public.seller_form_templates.is_active is
  'RLS allows authenticated read only when true; admin policies manage writes.';

-- --- seller_listings ----------------------------------------------------------

comment on table public.seller_listings is
  'Seller-owned listing rows. Shop reads via get_active_shop_listings() (security definer); '
  'direct table access constrained by RLS for seller CRUD.';

comment on column public.seller_listings.dynamic_values is
  'JSON object: template field ids -> values (e.g. listing_name, description, coverage, '
  'package_options lines, inclusions, etc.).';

comment on column public.seller_listings.template_id is
  'FK to seller_form_templates.id at creation time; nullable for legacy rows.';

comment on column public.seller_listings.location is
  'Legacy/top-level location; shop RPC also reads coverage/location from dynamic_values.';

-- --- Public shop RPC ----------------------------------------------------------

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
    coalesce(s.package_options, '[]'::jsonb) as seller_package_options
  from public.seller_listings sl
  inner join public.sellers s on s.user_id = sl.seller_user_id
  where sl.status = 'active'
    and s.status in ('active', 'pending');
$$;

revoke all on function public.get_active_shop_listings() from public;
grant execute on function public.get_active_shop_listings() to anon, authenticated;

comment on function public.get_active_shop_listings() is
  'SECURITY DEFINER: returns active listings for anon/auth shop UI without widening '
  'RLS on sellers/seller_listings. Includes seller package option labels, business '
  'metadata, and coalesced location/category from listing + dynamic_values. '
  'seller_registered_at uses coalesce(sellers.registered_at, listing.created_at). '
  'Sellers with status active or pending (see migration 025).';
