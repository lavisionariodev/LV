-- Put listing status "active" first so template defaults match public shop visibility
-- (get_active_shop_listings only returns seller_listings.status = 'active').

update public.seller_form_templates
set
  fields = (
    select coalesce(jsonb_agg(elem order by ord), '[]'::jsonb)
    from (
      select
        case
          when elem->>'id' = 'status' then jsonb_set(
            elem,
            '{options}',
            '["active", "draft", "inactive", "archived"]'::jsonb
          )
          else elem
        end as elem,
        ordinality as ord
      from jsonb_array_elements(fields) with ordinality as t(elem, ordinality)
    ) x
  ),
  updated_at = now()
where template_key = 'seller_new_listing';
