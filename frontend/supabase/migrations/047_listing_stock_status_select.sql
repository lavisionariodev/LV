-- Replace numeric stock_quantity with select: "In Stock" | "Out of Stock" (dynamic_values.stock_status).

CREATE OR REPLACE FUNCTION pg_temp.migrate_template_stock_to_status()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD;
  el jsonb;
  new_fields jsonb;
  inserted boolean;
  i int;
  n int;
  status_json constant jsonb := jsonb_build_object(
    'id', 'stock_status',
    'type', 'select',
    'label', 'Availability',
    'required', false,
    'placeholder', 'Select',
    'options', jsonb_build_array('In Stock', 'Out of Stock'),
    'sublabel', 'Whether buyers can add this listing to the cart.',
    'section', 'sales'
  );
BEGIN
  FOR r IN
    SELECT id, fields
    FROM public.seller_form_templates
    WHERE template_key = 'seller_new_listing'
  LOOP
    new_fields := '[]'::jsonb;
    inserted := false;
    n := coalesce(jsonb_array_length(r.fields), 0);

    IF n = 0 THEN
      new_fields := jsonb_build_array(status_json);
      inserted := true;
    ELSE
      FOR i IN 0..n - 1 LOOP
        el := r.fields->i;
        CONTINUE WHEN el IS NULL;
        CONTINUE WHEN coalesce(el->>'id', '') IN ('stock_quantity', 'stock_status');

        new_fields := new_fields || jsonb_build_array(el);

        IF coalesce(el->>'id', '') = 'base_price' AND NOT inserted THEN
          new_fields := new_fields || jsonb_build_array(status_json);
          inserted := true;
        END IF;
      END LOOP;

      IF NOT inserted THEN
        new_fields := new_fields || jsonb_build_array(status_json);
      END IF;
    END IF;

    UPDATE public.seller_form_templates
    SET fields = new_fields, updated_at = now()
    WHERE id = r.id;
  END LOOP;
END;
$$;

SELECT pg_temp.migrate_template_stock_to_status();
DROP FUNCTION pg_temp.migrate_template_stock_to_status();

-- Move listing data: numeric stock_quantity -> stock_status text; drop stock_quantity.
UPDATE public.seller_listings sl
SET
  dynamic_values =
    (sl.dynamic_values - 'stock_quantity')
    || jsonb_build_object(
      'stock_status',
      to_jsonb(
        CASE
          WHEN trim(coalesce(sl.dynamic_values->>'stock_quantity', '')) ~ '^-?[0-9]+(\.[0-9]+)?$'
            AND (trim(sl.dynamic_values->>'stock_quantity'))::numeric = 0
          THEN 'Out of Stock'
          ELSE 'In Stock'
        END
      )
    ),
  updated_at = now()
WHERE sl.dynamic_values ? 'stock_quantity';
