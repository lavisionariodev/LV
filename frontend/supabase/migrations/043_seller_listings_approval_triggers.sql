-- Enforce listing approval transitions and reset-to-pending on seller edits.
--
-- Rules:
-- - Sellers cannot set approval_status to approved/rejected.
-- - Admins can set approved/rejected (rejection requires a reason).
-- - Any seller update to an approved listing re-queues it (approval_status -> pending).
-- - Seller explicitly submitting for review (setting pending) stamps submitted_at and clears prior review fields.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins a where a.id = auth.uid());
$$;

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
  -- Admin-side validation
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

  -- Seller-side constraints
  if new.approval_status in ('approved', 'rejected') then
    raise exception 'Only admins can approve or reject listings.';
  end if;

  -- Compute "material change" (simple, safe definition)
  v_material_change :=
    (new.listing_name is distinct from old.listing_name)
    or (new.category is distinct from old.category)
    or (new.base_price is distinct from old.base_price)
    or (new.location is distinct from old.location)
    or (new.dynamic_values is distinct from old.dynamic_values)
    or (new.image_urls is distinct from old.image_urls);

  -- Any material seller edit after approval re-queues the listing.
  if old.approval_status = 'approved' and v_material_change then
    new.approval_status := 'pending';
    new.submitted_at := now();
    new.reviewed_at := null;
    new.reviewed_by := null;
    new.rejection_reason := null;
    return new;
  end if;

  -- Seller explicit submit / resubmit
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

drop trigger if exists trg_enforce_listing_approval_workflow on public.seller_listings;
create trigger trg_enforce_listing_approval_workflow
before update on public.seller_listings
for each row
execute function public.enforce_listing_approval_workflow();

