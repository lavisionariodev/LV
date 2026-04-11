-- Migrate package_options field from textarea (one-per-line) to string_list (Add option UI on seller form).

update public.seller_form_templates sft
set
  fields = coalesce(
    (
      select jsonb_agg(sub.elem order by sub.ord)
      from (
        select
          t.ord,
          case
            when t.elem->>'id' = 'package_options'
              and coalesce(t.elem->>'type', '') = 'textarea'
            then
              t.elem
              || jsonb_build_object(
                'type',
                'string_list',
                'placeholder',
                coalesce(nullif(trim(t.elem->>'placeholder'), ''), 'Buyer-facing label')
              )
              - 'maxLength'
            else t.elem
          end as elem
        from jsonb_array_elements(sft.fields) with ordinality as t(elem, ord)
      ) sub
    ),
    sft.fields
  ),
  updated_at = now()
where sft.template_key = 'seller_new_listing';
