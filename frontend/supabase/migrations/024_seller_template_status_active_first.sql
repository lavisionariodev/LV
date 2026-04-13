-- (Deprecated) This migration previously reordered a seller-editable `status` field in the template.
-- Status is now system-driven (draft/pending/approved/archived) and should not appear in the template.

update public.seller_form_templates
set
  fields = (
    select coalesce(jsonb_agg(elem order by ord), '[]'::jsonb)
    from (
      select
        elem,
        ordinality as ord
      from jsonb_array_elements(fields) with ordinality as t(elem, ordinality)
      where coalesce(elem->>'id', '') <> 'status'
    ) x
  ),
  updated_at = now()
where template_key = 'seller_new_listing';
