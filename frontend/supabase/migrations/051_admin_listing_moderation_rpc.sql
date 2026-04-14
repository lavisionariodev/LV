-- Atomic admin moderation RPCs for seller listings.
-- - approve_listing(): approves listing and merges staged pending_changes (if any) transactionally
-- - reject_listing(): rejects either (a) staged updates on an approved listing (clears pending_changes)
--   or (b) a pending listing (approval_status -> rejected)
--
-- These are SECURITY DEFINER and enforce admin access via public.is_admin().

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
    -- Approval fields
    approval_status = 'approved',
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    rejection_reason = null,
    staged_rejection_reason = null,

    -- Listing lifecycle: approved listings are intended to be active (visibility still gated by shop RPC).
    status = 'active',

    -- Merge staged changes (if any). These keys match migration 050.
    listing_name = coalesce(v_pending->>'listing_name', sl.listing_name),
    category = coalesce(v_pending->>'category', sl.category),
    funeral_category = coalesce(v_pending->>'funeral_category', sl.funeral_category),
    description = coalesce(v_pending->>'description', sl.description),
    duration = coalesce(v_pending->>'duration', sl.duration),
    location = coalesce(v_pending->>'location', sl.location),
    listing_kind = coalesce(v_pending->>'listing_kind', sl.listing_kind),
    base_price = coalesce((v_pending->>'base_price')::numeric, sl.base_price),
    package_options = coalesce((v_pending->'package_options')::text[], sl.package_options),
    stock_status = coalesce(v_pending->>'stock_status', sl.stock_status),
    inclusions = coalesce(v_pending->>'inclusions', sl.inclusions),
    who_this_is_for = coalesce(v_pending->>'who_this_is_for', sl.who_this_is_for),
    important_notes = coalesce(v_pending->>'important_notes', sl.important_notes),
    image_urls = coalesce((v_pending->'image_urls')::text[], sl.image_urls),

    -- Clear stage
    pending_changes = '{}'::jsonb,
    pending_changes_submitted_at = null
  where sl.id = p_listing_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.approve_listing(uuid) from public;
grant execute on function public.approve_listing(uuid) to authenticated;

comment on function public.approve_listing(uuid) is
  'SECURITY DEFINER: admin-only. Approves a seller listing and transactionally merges seller_listings.pending_changes onto published columns, then clears pending_changes. Sets status=active.';


create or replace function public.reject_listing(p_listing_id uuid, p_reason text)
returns public.seller_listings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean := public.is_admin();
  v_row public.seller_listings%rowtype;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_has_pending boolean := false;
begin
  if not v_is_admin then
    raise exception 'Forbidden';
  end if;
  if v_reason = '' then
    raise exception 'Rejection reason is required.';
  end if;

  select *
  into v_row
  from public.seller_listings
  where id = p_listing_id
  for update;

  if not found then
    raise exception 'Listing not found';
  end if;

  v_has_pending := coalesce(v_row.pending_changes, '{}'::jsonb) <> '{}'::jsonb;

  -- If this is an approved listing with staged edits, reject the stage only.
  if v_row.approval_status = 'approved' and v_has_pending then
    update public.seller_listings sl
    set
      pending_changes = '{}'::jsonb,
      pending_changes_submitted_at = null,
      staged_rejection_reason = v_reason,
      reviewed_at = now(),
      reviewed_by = auth.uid()
    where sl.id = p_listing_id
    returning * into v_row;
    return v_row;
  end if;

  -- Otherwise reject the listing itself.
  update public.seller_listings sl
  set
    approval_status = 'rejected',
    rejection_reason = v_reason,
    reviewed_at = now(),
    reviewed_by = auth.uid()
  where sl.id = p_listing_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.reject_listing(uuid, text) from public;
grant execute on function public.reject_listing(uuid, text) to authenticated;

comment on function public.reject_listing(uuid, text) is
  'SECURITY DEFINER: admin-only. Rejects a pending listing (approval_status=rejected) OR rejects staged edits on an approved listing by clearing pending_changes and setting staged_rejection_reason.';

