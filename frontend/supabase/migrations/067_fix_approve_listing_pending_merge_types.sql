-- approve_listing merged pending_changes using wrong types:
-- - package_options on seller_listings is jsonb (migration 048), not text[]
-- - image_urls is text[] but must be built from the JSON array stored in pending_changes
-- Either mismatch caused approve_listing to fail when approving staged seller edits.

create or replace function public.approve_listing(p_listing_id uuid)
returns public.seller_listings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean := public.is_admin();
  v_row public.seller_listings%rowtype;
  v_pending jsonb;
begin
  if not v_is_admin then
    raise exception 'Forbidden';
  end if;

  select *
  into v_row
  from public.seller_listings
  where id = p_listing_id
  for update;

  if not found then
    raise exception 'Listing not found';
  end if;

  v_pending := coalesce(v_row.pending_changes, '{}'::jsonb);

  update public.seller_listings sl
  set
    approval_status = 'approved',
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    rejection_reason = null,
    staged_rejection_reason = null,

    status = 'active',

    listing_name = coalesce(v_pending->>'listing_name', sl.listing_name),
    category = coalesce(v_pending->>'category', sl.category),
    funeral_category = coalesce(v_pending->>'funeral_category', sl.funeral_category),
    description = coalesce(v_pending->>'description', sl.description),
    duration = coalesce(v_pending->>'duration', sl.duration),
    location = coalesce(v_pending->>'location', sl.location),
    listing_kind = coalesce(v_pending->>'listing_kind', sl.listing_kind),
    base_price = coalesce((v_pending->>'base_price')::numeric, sl.base_price),
    package_options = case
      when not (v_pending ? 'package_options') then sl.package_options
      when jsonb_typeof(v_pending->'package_options') = 'null' then sl.package_options
      else v_pending->'package_options'
    end,
    stock_status = coalesce(v_pending->>'stock_status', sl.stock_status),
    inclusions = coalesce(v_pending->>'inclusions', sl.inclusions),
    who_this_is_for = coalesce(v_pending->>'who_this_is_for', sl.who_this_is_for),
    important_notes = coalesce(v_pending->>'important_notes', sl.important_notes),
    image_urls = case
      when not (v_pending ? 'image_urls') then sl.image_urls
      when jsonb_typeof(v_pending->'image_urls') <> 'array' then sl.image_urls
      else coalesce(
        array(select jsonb_array_elements_text(v_pending->'image_urls')),
        '{}'::text[]
      )
    end,

    pending_changes = '{}'::jsonb,
    pending_changes_submitted_at = null
  where sl.id = p_listing_id
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.approve_listing(uuid) is
  'SECURITY DEFINER: admin-only. Approves a seller listing and merges pending_changes using correct jsonb/text[] types; clears pending_changes.';
