-- Phase C: Remove dynamic_values JSON blob, template_id FK, and seller_form_templates.

drop index if exists public.idx_seller_listings_dynamic_values_gin;

alter table public.seller_listings drop column if exists dynamic_values;
alter table public.seller_listings drop column if exists template_id;

drop policy if exists "read_active_seller_form_templates" on public.seller_form_templates;
drop policy if exists "admin_manage_seller_form_templates" on public.seller_form_templates;

drop trigger if exists trg_seller_form_templates_updated_at on public.seller_form_templates;

drop table if exists public.seller_form_templates;

-- Trigger: no dynamic_values column anymore
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
