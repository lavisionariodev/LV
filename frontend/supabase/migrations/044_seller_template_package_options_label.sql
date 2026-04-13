-- Align seller form label with shop behavior: per-listing package choices are `dynamic_values.package_options`
-- (JSON array of strings). Buyer-facing dropdown uses that array (then falls back to `sellers.package_options`;
-- see migrations 036, 041).

update public.seller_form_templates sft
set
  fields = coalesce(
    (
      select jsonb_agg(sub.elem order by sub.ord)
      from (
        select
          t.ord,
          case
            when t.elem->>'id' = 'package_options' and coalesce(t.elem->>'type', '') = 'string_list'
            then
              t.elem
              || jsonb_build_object(
                'label',
                'Package',
                'sublabel',
                coalesce(nullif(trim(t.elem->>'sublabel'), ''), 'Buyer-facing labels'),
                'placeholder',
                coalesce(nullif(trim(t.elem->>'placeholder'), ''), 'Option label')
              )
            else t.elem
          end as elem
        from jsonb_array_elements(sft.fields) with ordinality as t(elem, ord)
      ) sub
    ),
    sft.fields
  ),
  updated_at = now()
where sft.template_key = 'seller_new_listing';
