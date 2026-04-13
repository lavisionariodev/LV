-- Add seller-facing stock quantity; remove self-serve "highlight as popular" (replaced by real availability).
-- Cleans legacy keys from listing JSON.

CREATE OR REPLACE FUNCTION pg_temp.migrate_seller_new_listing_fields()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD;
  el jsonb;
  new_fields jsonb;
  inserted_stock boolean;
  i int;
  n int;
  stock_json constant jsonb := jsonb_build_object(
    'id', 'stock_quantity',
    'type', 'number',
    'label', 'Stock quantity',
    'required', false,
    'placeholder', '0',
    'sublabel', 'Units or slots available. Use 0 when sold out; leave empty if not tracking inventory.',
    'section', 'sales'
  );
BEGIN
  FOR r IN
    SELECT id, fields
    FROM public.seller_form_templates
    WHERE template_key = 'seller_new_listing'
  LOOP
    new_fields := '[]'::jsonb;
    inserted_stock := false;
    n := coalesce(jsonb_array_length(r.fields), 0);

    IF n = 0 THEN
      new_fields := jsonb_build_array(stock_json);
      inserted_stock := true;
    ELSE
      FOR i IN 0..n - 1 LOOP
        el := r.fields->i;
        CONTINUE WHEN el IS NULL;
        CONTINUE WHEN coalesce(el->>'id', '') = 'featured';
        CONTINUE WHEN coalesce(el->>'id', '') = 'stock_quantity';

        new_fields := new_fields || jsonb_build_array(el);

        IF coalesce(el->>'id', '') = 'base_price' AND NOT inserted_stock THEN
          new_fields := new_fields || jsonb_build_array(stock_json);
          inserted_stock := true;
        END IF;
      END LOOP;

      IF NOT inserted_stock THEN
        new_fields := new_fields || jsonb_build_array(stock_json);
      END IF;
    END IF;

    UPDATE public.seller_form_templates
    SET fields = new_fields, updated_at = now()
    WHERE id = r.id;
  END LOOP;
END;
$$;

SELECT pg_temp.migrate_seller_new_listing_fields();
DROP FUNCTION pg_temp.migrate_seller_new_listing_fields();

-- Remove legacy highlight keys from stored listings.
UPDATE public.seller_listings
SET
  dynamic_values = coalesce(dynamic_values, '{}'::jsonb) - 'featured' - 'popular',
  updated_at = coalesce(updated_at, now())
WHERE (dynamic_values ? 'featured')
   OR (dynamic_values ? 'popular');
