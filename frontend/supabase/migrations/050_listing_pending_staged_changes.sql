-- Staged updates for already-approved listings: seller edits accumulate in pending_changes;
-- published columns stay live for the public shop until an admin approves the merge.

alter table public.seller_listings
  add column if not exists pending_changes jsonb not null default '{}'::jsonb,
  add column if not exists pending_changes_submitted_at timestamptz,
  add column if not exists staged_rejection_reason text;

alter table public.seller_listings
  add constraint seller_listings_pending_changes_is_object
  check (jsonb_typeof(pending_changes) = 'object');

create index if not exists idx_seller_listings_pending_changes_nonempty
  on public.seller_listings ((pending_changes <> '{}'::jsonb))
  where pending_changes is not null;

comment on column public.seller_listings.pending_changes is
  'For approval_status=approved: proposed field values not yet merged to published columns (public shop still reads live columns).';
comment on column public.seller_listings.staged_rejection_reason is
  'When an admin rejects staged updates on an approved listing (does not change approval_status).';

-- Replace trigger: approved listings no longer flip to pending on edit; edits stage into pending_changes.
create or replace function public.enforce_listing_approval_workflow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean := public.is_admin();
  v_material_change boolean := false;
  delta jsonb := '{}'::jsonb;
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

  -- Approved seller listing: stage edits without touching public columns or shop visibility.
  if old.approval_status = 'approved' and v_material_change then
    if new.listing_name is distinct from old.listing_name then
      delta := delta || jsonb_build_object('listing_name', to_jsonb(new.listing_name));
    end if;
    if new.category is distinct from old.category then
      delta := delta || jsonb_build_object('category', to_jsonb(new.category));
    end if;
    if new.base_price is distinct from old.base_price then
      delta := delta || jsonb_build_object('base_price', to_jsonb(new.base_price));
    end if;
    if new.location is distinct from old.location then
      delta := delta || jsonb_build_object('location', to_jsonb(new.location));
    end if;
    if new.image_urls is distinct from old.image_urls then
      delta := delta || jsonb_build_object('image_urls', to_jsonb(new.image_urls));
    end if;
    if new.description is distinct from old.description then
      delta := delta || jsonb_build_object('description', to_jsonb(new.description));
    end if;
    if new.duration is distinct from old.duration then
      delta := delta || jsonb_build_object('duration', to_jsonb(new.duration));
    end if;
    if new.listing_kind is distinct from old.listing_kind then
      delta := delta || jsonb_build_object('listing_kind', to_jsonb(new.listing_kind));
    end if;
    if new.funeral_category is distinct from old.funeral_category then
      delta := delta || jsonb_build_object('funeral_category', to_jsonb(new.funeral_category));
    end if;
    if new.package_options is distinct from old.package_options then
      delta := delta || jsonb_build_object('package_options', new.package_options);
    end if;
    if new.stock_status is distinct from old.stock_status then
      delta := delta || jsonb_build_object('stock_status', to_jsonb(new.stock_status));
    end if;
    if new.inclusions is distinct from old.inclusions then
      delta := delta || jsonb_build_object('inclusions', to_jsonb(new.inclusions));
    end if;
    if new.who_this_is_for is distinct from old.who_this_is_for then
      delta := delta || jsonb_build_object('who_this_is_for', to_jsonb(new.who_this_is_for));
    end if;
    if new.important_notes is distinct from old.important_notes then
      delta := delta || jsonb_build_object('important_notes', to_jsonb(new.important_notes));
    end if;

    new.pending_changes := coalesce(old.pending_changes, '{}'::jsonb) || delta;
    new.pending_changes_submitted_at := now();
    new.staged_rejection_reason := null;

    new.listing_name := old.listing_name;
    new.category := old.category;
    new.base_price := old.base_price;
    new.location := old.location;
    new.image_urls := old.image_urls;
    new.description := old.description;
    new.duration := old.duration;
    new.listing_kind := old.listing_kind;
    new.funeral_category := old.funeral_category;
    new.package_options := old.package_options;
    new.stock_status := old.stock_status;
    new.inclusions := old.inclusions;
    new.who_this_is_for := old.who_this_is_for;
    new.important_notes := old.important_notes;

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
