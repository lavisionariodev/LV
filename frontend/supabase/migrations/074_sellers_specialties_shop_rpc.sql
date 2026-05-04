-- Shop profile "Specialties" pills; controlled by seller (not inferred from listings only).

alter table public.sellers
  add column if not exists specialties text[];

comment on column public.sellers.specialties is
  'Public-facing specialty labels for storefront profile (e.g. pills). Order preserved; empty array when unset.';

update public.sellers
set specialties = '{}'::text[]
where specialties is null;

alter table public.sellers
  alter column specialties set default '{}'::text[];

alter table public.sellers
  alter column specialties set not null;

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
  seller_username text,
  seller_business_info text,
  seller_tagline text,
  seller_specialties text[],
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
  important_notes text
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
    nullif(lower(trim(coalesce(s.username, ''))), '') as seller_username,
    nullif(trim(coalesce(s.business_info, '')), '') as seller_business_info,
    nullif(trim(coalesce(s.tagline, '')), '') as seller_tagline,
    coalesce(s.specialties, '{}'::text[]) as seller_specialties,
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
    sl.important_notes
  from public.seller_listings sl
  inner join public.sellers s on s.user_id = sl.seller_user_id
  where sl.status = 'active'
    and sl.approval_status = 'approved'
    and s.status = 'active';
$$;

revoke all on function public.get_active_shop_listings() from public;
grant execute on function public.get_active_shop_listings() to anon, authenticated;

comment on function public.get_active_shop_listings() is
  'SECURITY DEFINER: public shop listings. '
  'Includes seller_username, seller_tagline, seller_business_info, seller_specialties from sellers; '
  'requires active seller, approved active listing.';
