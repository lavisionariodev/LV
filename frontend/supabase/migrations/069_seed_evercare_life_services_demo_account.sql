-- ============================================================================
-- Evercare Life Services — demo listings (same body as 068).
--
-- Why a second migration: projects that already ran an older 068 (different UUID)
-- will not re-execute 068. This migration applies the same idempotent seed for the
-- current demo UUID so those databases still get the five services if missing.
--
-- Credentials (reference):
--   Shop name     Evercare Life Services
--   Demo email    s2020105028@firstasia.edu.ph
--   user_id       6da71112-f1c9-4d94-b7eb-16a3a762a566
--
-- Preconditions: public.sellers row exists for user_id above; auth user exists.
-- Idempotent: skips existing seller_user_id + listing_name pairs.
-- ============================================================================

with evercare as (
  select
    '6da71112-f1c9-4d94-b7eb-16a3a762a566'::uuid as user_id,
    'Evercare Life Services'::text as label_prefix
),
service_catalog as (
  select *
  from (
    values
      (
        1,
        'Memorial planning consultation'::text,
        'Memorial planning'::text,
        'memorial-planning'::text,
        '1–2 planning sessions'::text,
        4800::numeric(12, 2),
        'Walk-through of timelines, venues, and paperwork with '::text
          || 'a single coordinator. {{SELLER}} helps your family align expectations before commitments.',
        'Written checklist (timeline, contacts, documents)'::text || E'\n'
          || 'One follow-up call within 5 business days' || E'\n'
          || 'Printed summary of next steps',
        'First-time arrangers who want clarity before choosing packages or chapels.'::text,
        'Consult fee may be credited toward a later package from the same seller when booked within 30 days.'::text,
        'Quezon City & nearby'::text
      ),
      (
        2,
        'Direct cremation coordination',
        'Cremation',
        'cremation',
        'Typically 3–7 days',
        22500,
        '{{SELLER}} coordinates documentation, crematory scheduling, and urn handover. Sample listing for catalog demos; replace with your live SOP and inclusions.',
        'Document pickup guidance and checklist' || E'\n'
          || 'Crematory slot coordination' || E'\n'
          || 'Basic urn or temporary container per facility rules',
        'Families choosing simple cremation with minimal ceremony.',
        'Third-party crematory fees billed separately where applicable. Proof of kinship may be required.',
        'Metro Manila'
      ),
      (
        3,
        'Traditional burial arrangement',
        'Traditional burial',
        'traditional-burial',
        '5–10 days lead time',
        68500,
        'Ground burial support: cemetery liaison, viewing window, and procession basics. {{SELLER}} provides structured coordination; vault or lot costs are outside this sample price.',
        'Cemetery paperwork orientation' || E'\n'
          || 'Hearse and staff timing outline' || E'\n'
          || 'Floral and program referrals (optional vendors)',
        'Families preferring in-ground burial with traditional viewing.',
        'Lot, opening/closing, and marker are typically billed by the cemetery. Confirm religion-specific rites separately.',
        'Greater Manila'
      ),
      (
        4,
        'Chapel wake & viewing setup',
        'Memorial planning',
        'memorial-planning',
        'Per agreed wake dates',
        32000,
        'Chapel block booking, guest flow plan, and audio for memorial videos or playlists. {{SELLER}} focuses on dignified space readiness — catering is referral-only in this seed.',
        'Chapel use window as contracted' || E'\n'
          || 'Basic sound setup for eulogies' || E'\n'
          || 'Visitor registry table supplies',
        'Mid-sized gatherings needing on-site wake space with light AV.',
        'Peak dates may surcharge. Parking and catering remain family-selected unless you add a bundle later.',
        'Makati / Taguig corridor'
      ),
      (
        5,
        'Civil registry & permit assistance',
        'Memorial planning',
        'memorial-planning',
        '2–5 business days after docs',
        6500,
        'Guided filing for death certificate extracts and common municipal notices. {{SELLER}} does not replace legal counsel; this is administrative navigation support.',
        'Form review before filing' || E'\n'
          || 'Queue strategy and document copies list' || E'\n'
          || 'One correction round on rejected filings (same municipality)',
        'Executors juggling paperwork while arranging services.',
        'Government fees are paid directly to agencies. Rush or provincial filings may cost extra.',
        'NCR (by appointment)'
      )
  ) as t(
    svc_num,
    service_title,
    category,
    funeral_category,
    duration,
    base_price,
    description_tpl,
    inclusions,
    who_this_is_for,
    important_notes,
    coverage_area
  )
),
rows_to_insert as (
  select
    e.user_id,
    e.label_prefix,
    c.svc_num,
    c.service_title,
    c.category,
    c.funeral_category,
    c.duration,
    c.base_price,
    replace(c.description_tpl, '{{SELLER}}', e.label_prefix) as description,
    c.inclusions,
    c.who_this_is_for,
    c.important_notes,
    c.coverage_area
  from evercare e
  cross join service_catalog c
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
  r.label_prefix || ' — ' || r.service_title,
  r.category,
  r.description,
  r.duration,
  r.coverage_area,
  'service',
  r.funeral_category,
  r.base_price,
  '[]'::jsonb,
  'In Stock',
  r.inclusions,
  r.who_this_is_for,
  r.important_notes,
  'active',
  'approved',
  now() - interval '2 days',
  now() - interval '1 day',
  array[
    format(
      'https://picsum.photos/seed/%s/640/420',
      md5(r.user_id::text || '-' || r.service_title)
    )
  ]::text[]
from rows_to_insert r
inner join public.sellers se on se.user_id = r.user_id
where not exists (
  select 1
  from public.seller_listings sl
  where sl.seller_user_id = r.user_id
    and sl.listing_name = r.label_prefix || ' — ' || r.service_title
);
