-- Phase A: Add first-class listing columns, backfill from dynamic_values,
-- replace get_active_shop_listings, fix approval trigger (seller edits on approved rows).

-- 1) New columns ------------------------------------------------------------
alter table public.seller_listings
  add column if not exists description text,
  add column if not exists duration text,
  add column if not exists listing_kind text,
  add column if not exists funeral_category text,
  add column if not exists package_options jsonb not null default '[]'::jsonb,
  add column if not exists stock_status text,
  add column if not exists inclusions text,
  add column if not exists who_this_is_for text,
  add column if not exists important_notes text;

-- 2) Approval trigger MUST run before data backfills: migrations have no auth.uid(),
--    so is_admin() is false. Also fix logic: only block when seller *changes* status
--    to approved/rejected, not when those fields stay unchanged during other edits.
create or replace function public.enforce_listing_approval_workflow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean := public.is_admin();
  v_material_change boolean := false;
begin
  if v_is_admin then
    if new.approval_status = 'rejected' and (new.rejection_reason is null or btrim(new.rejection_reason) = '') then
      raise exception 'Rejection reason is required.';
    end if;

    if new.approval_status in ('approved', 'rejected') then
      new.reviewed_at := coalesce(new.reviewed_at, now());
      new.reviewed_by := coalesce(new.reviewed_by, auth.uid());
    end if;

    if new.approval_status = 'approved' then
      new.rejection_reason := null;
    end if;

    return new;
  end if;

  if (new.approval_status is distinct from old.approval_status)
     and new.approval_status in ('approved', 'rejected') then
    raise exception 'Only admins can approve or reject listings.';
  end if;

  v_material_change :=
    (new.listing_name is distinct from old.listing_name)
    or (new.category is distinct from old.category)
    or (new.base_price is distinct from old.base_price)
    or (new.location is distinct from old.location)
    or (new.dynamic_values is distinct from old.dynamic_values)
    or (new.image_urls is distinct from old.image_urls)
    or (new.description is distinct from old.description)
    or (new.duration is distinct from old.duration)
    or (new.listing_kind is distinct from old.listing_kind)
    or (new.funeral_category is distinct from old.funeral_category)
    or (new.package_options is distinct from old.package_options)
    or (new.stock_status is distinct from old.stock_status)
    or (new.inclusions is distinct from old.inclusions)
    or (new.who_this_is_for is distinct from old.who_this_is_for)
    or (new.important_notes is distinct from old.important_notes);

  if old.approval_status = 'approved' and v_material_change then
    new.approval_status := 'pending';
    new.submitted_at := now();
    new.reviewed_at := null;
    new.reviewed_by := null;
    new.rejection_reason := null;
    return new;
  end if;

  if new.approval_status = 'pending' and old.approval_status is distinct from 'pending' then
    new.submitted_at := now();
    new.reviewed_at := null;
    new.reviewed_by := null;
    new.rejection_reason := null;
    return new;
  end if;

  return new;
end;
$$;

-- 3) Backfill from dynamic_values --------------------------------------------
update public.seller_listings sl
set
  description = coalesce(
    nullif(trim(sl.description), ''),
    nullif(trim(sl.dynamic_values->>'description'), '')
  ),
  duration = coalesce(
    nullif(trim(sl.duration), ''),
    nullif(trim(sl.dynamic_values->>'duration'), '')
  ),
  listing_kind = coalesce(
    nullif(trim(sl.listing_kind), ''),
    nullif(lower(trim(sl.dynamic_values->>'kind')), '')
  ),
  funeral_category = coalesce(
    nullif(trim(sl.funeral_category), ''),
    nullif(trim(sl.dynamic_values->>'funeral_category'), '')
  ),
  package_options = case
    when sl.dynamic_values ? 'package_options'
      and jsonb_typeof(sl.dynamic_values->'package_options') = 'array'
      and coalesce(jsonb_array_length(sl.dynamic_values->'package_options'), 0) > 0
    then sl.dynamic_values->'package_options'
    else coalesce(sl.package_options, '[]'::jsonb)
  end,
  stock_status = coalesce(
    sl.stock_status,
    case
      when sl.dynamic_values ? 'stock_quantity'
        and trim(coalesce(sl.dynamic_values->>'stock_quantity', '')) ~ '^-?[0-9]+(\.[0-9]+)?$'
        and (trim(sl.dynamic_values->>'stock_quantity'))::numeric = 0
      then 'Out of Stock'
      when trim(coalesce(sl.dynamic_values->>'stock_status', '')) <> ''
      then case
        when lower(trim(sl.dynamic_values->>'stock_status')) in ('out of stock', 'out_of_stock')
        then 'Out of Stock'
        else 'In Stock'
      end
      else null
    end
  ),
  who_this_is_for = coalesce(
    nullif(trim(sl.who_this_is_for), ''),
    nullif(trim(sl.dynamic_values->>'who_this_is_for'), '')
  ),
  important_notes = coalesce(
    nullif(trim(sl.important_notes), ''),
    nullif(trim(sl.dynamic_values->>'important_notes'), '')
  ),
  location = coalesce(
    nullif(trim(sl.location), ''),
    nullif(trim(sl.dynamic_values->>'coverage'), ''),
    nullif(trim(sl.dynamic_values->>'location'), '')
  )
where true;

-- Inclusions: json array -> newline-separated text, else string
update public.seller_listings sl
set inclusions = coalesce(
  nullif(trim(sl.inclusions), ''),
  case
    when jsonb_typeof(sl.dynamic_values->'inclusions') = 'array'
      and coalesce(jsonb_array_length(sl.dynamic_values->'inclusions'), 0) > 0
    then (
      select string_agg(elem, E'\n')
      from jsonb_array_elements_text(sl.dynamic_values->'inclusions') as t(elem)
    )
    else nullif(trim(sl.dynamic_values->>'inclusions'), '')
  end
)
where sl.dynamic_values is not null;

-- 4) Shop RPC: explicit columns (no dynamic_values in result) ---------------
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
  'SECURITY DEFINER: public shop listings. Requires active seller, active listing, approved. '
  'Listing detail fields are first-class columns on seller_listings. '
  'seller_package_options prefers listing.package_options when non-empty, else sellers.package_options.';
