-- Product listings for demo sellers (physical / deliverable items).
-- Idempotent: skips when the same seller already has that exact listing_name.
-- Pre-approved for shop visibility (status = active, approval_status = approved, reviewed_at set).
--
-- Product rows omit service-only fields (duration, who_this_is_for, package_options).
-- inclusions holds product-detail lines (specs), matching the seller Product listing form.
--
-- Images: stable placeholder URLs (picsum.photos) until sellers upload Storage assets.

with catalog_sellers as (
  select *
  from (
    values
      ('6da71112-f1c9-4d94-b7eb-16a3a762a566'::uuid, 'Evercare Life Services'),
      ('a780a923-36b7-45d0-b0c8-067331324993'::uuid, 'Heavenly Grace Memorial'),
      ('9fb28588-7aac-4395-bd1e-ac01c5561a25'::uuid, 'Funeral Homes'),
      ('a0b9812c-003e-471e-a993-e1b174a97d75'::uuid, 'Serenity Memorial Chapel')
  ) as v(user_id, label_prefix)
),
product_catalog as (
  select *
  from (
    values
      (
        1,
        'Sympathy wreath (standing)'::text,
        'Memorial planning'::text,
        'memorial-planning'::text,
        3500::numeric(12, 2),
        '{{SELLER}} supplies a freestanding sympathy wreath suitable for chapel or home wake viewing. Delivered within our published Metro coverage after order confirmation.',
        'Approx. 90 cm standing height' || E'\n'
          || 'White and cream seasonal blooms' || E'\n'
          || 'Includes wire easel when venue allows',
        'Delivery in 1–3 business days after paid order confirmation. Fresh flowers are seasonal; substitutions of equal value may apply.',
        'Metro Manila & nearby LGUs'
      ),
      (
        2,
        'Condolence flower basket'::text,
        'Memorial planning'::text,
        'memorial-planning'::text,
        2850,
        'Compact basket arrangement for home delivery or chapel side tables. {{SELLER}} coordinates hand-off to your provided address.',
        'Round basket approx. 40 cm' || E'\n'
          || 'Mixed white and pastel blooms' || E'\n'
          || 'Care instruction card included',
        'Perishable item — recipient or authorized receiver must be available. Re-delivery fees may apply.',
        'Metro Manila'
      ),
      (
        3,
        'Memorial guest book set'::text,
        'Memorial planning'::text,
        'memorial-planning'::text,
        495,
        'Hardcover guest book with matching pen for signatures and messages. {{SELLER}} ships non-perishable memorial supplies.',
        'Linen-look hardcover guest book' || E'\n'
          || 'Matching pen in black or silver' || E'\n'
          || 'Approx. 200 lined pages',
        'Allow 2–5 business days for courier delivery. Custom embossing quoted separately upon request.',
        'Nationwide courier (Philippines)'
      ),
      (
        4,
        'Classic white funeral wreath (large)'::text,
        'Traditional burial'::text,
        'traditional-burial'::text,
        5200,
        'Large circular wreath for traditional services and graveside rites. {{SELLER}} delivers or coordinates drop-off at venue.',
        'Approx. 110 cm diameter on stand' || E'\n'
          || 'Dense white chrysanthemum-style focal blooms' || E'\n'
          || 'Ivory ribbon sash (custom ribbon text available on request)',
        'Peak dates may extend lead time. Venue must allow fresh floral delivery access.',
        'Greater Manila'
      ),
      (
        5,
        'Brushed bronze cremation urn'::text,
        'Cremation'::text,
        'cremation'::text,
        4200,
        'Adult-size decorative urn for cremated remains (capacity per manufacturer spec). {{SELLER}} ships boxed with cushioning.',
        'Brushed bronze finish metal urn' || E'\n'
          || 'Adult capacity (industry standard volume)' || E'\n'
          || 'Velvet pouch and box packaging',
        'Confirm crematory release paperwork before shipping. Urn sealing accessories may be separate.',
        'Nationwide courier (Philippines)'
      )
  ) as t(
    product_num,
    product_title,
    category,
    funeral_category,
    base_price,
    description_tpl,
    inclusions,
    important_notes,
    delivery_area
  )
),
rows_to_insert as (
  select
    s.user_id,
    s.label_prefix,
    c.product_num,
    c.product_title,
    c.category,
    c.funeral_category,
    c.base_price,
    replace(c.description_tpl, '{{SELLER}}', s.label_prefix) as description,
    c.inclusions,
    c.important_notes,
    c.delivery_area
  from catalog_sellers s
  cross join product_catalog c
)
insert into public.seller_listings (
  seller_user_id,
  listing_name,
  category,
  description,
  duration,
  location,
  listing_kind,
  funeral_category,
  base_price,
  package_options,
  stock_status,
  inclusions,
  who_this_is_for,
  important_notes,
  status,
  approval_status,
  submitted_at,
  reviewed_at,
  image_urls
)
select
  r.user_id,
  r.label_prefix || ' — ' || r.product_title,
  r.category,
  r.description,
  null::text,
  r.delivery_area,
  'product',
  r.funeral_category,
  r.base_price,
  '[]'::jsonb,
  'In Stock',
  r.inclusions,
  null::text,
  r.important_notes,
  'active',
  'approved',
  now() - interval '2 days',
  now() - interval '1 day',
  array[
    format(
      'https://picsum.photos/seed/%s/640/420',
      md5(r.user_id::text || '-' || r.product_title || '-' || r.product_num::text)
    )
  ]::text[]
from rows_to_insert r
inner join public.sellers se on se.user_id = r.user_id
where not exists (
  select 1
  from public.seller_listings sl
  where sl.seller_user_id = r.user_id
    and sl.listing_name = r.label_prefix || ' — ' || r.product_title
);
