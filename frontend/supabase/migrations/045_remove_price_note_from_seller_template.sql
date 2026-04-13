-- Drop price_note from the seller new-listing template (not shown on shop; data was only in dynamic_values).

update public.seller_form_templates sft
set
  fields = coalesce(
    (
      select jsonb_agg(elem order by ord)
      from (
        select t.elem, t.ord
        from jsonb_array_elements(sft.fields) with ordinality as t(elem, ord)
        where coalesce(t.elem->>'id', '') <> 'price_note'
      ) sub
    ),
    '[]'::jsonb
  ),
  section_config = case
    when sft.section_config is not null
      and jsonb_typeof(sft.section_config -> 'sections') = 'array'
    then
      jsonb_set(
        sft.section_config,
        '{sections}',
        coalesce(
          (
            select jsonb_agg(
              case
                when sec ->> 'id' = 'sales' then
                  jsonb_set(
                    jsonb_set(
                      sec,
                      '{tipBody}',
                      to_jsonb(
                        'Set a starting price buyers can trust. Package options power the buyer package dropdown on the shop detail page.'::text
                      )
                    ),
                    '{shopGuide}',
                    to_jsonb('Shop: price, package picker when options exist.'::text)
                  )
                else sec
              end
            )
            from jsonb_array_elements(sft.section_config -> 'sections') as sec
          ),
          sft.section_config -> 'sections'
        )
      )
    else sft.section_config
  end,
  updated_at = now()
where sft.template_key = 'seller_new_listing';
