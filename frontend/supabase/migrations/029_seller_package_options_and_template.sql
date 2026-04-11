-- Per-seller package tier names for listing forms; each listing stores the chosen value in dynamic_values.package.

alter table public.sellers
  add column if not exists package_options jsonb not null default '[]'::jsonb;

comment on column public.sellers.package_options is
  'JSON array of strings (e.g. ["Gold","Silver"]). Listing field "package" selects one; configure in seller settings.';

-- Rebuild template: insert "Package" select (options loaded from sellers.package_options in the app via optionsFrom).
update public.seller_form_templates
set
  fields = '[
    {"id":"listing_name","order":0,"type":"text","label":"Listing name","required":true,"placeholder":"e.g. Memorial service package"},
    {"id":"description","order":1,"type":"textarea","label":"Description","required":true,"placeholder":"Describe your listing..."},
    {"id":"funeral_category","order":2,"type":"select","label":"Shop category","required":true,"options":["cremation","traditional-burial","memorial-planning"],"placeholder":"Select category"},
    {"id":"category","order":3,"type":"text","label":"Display label (optional)","required":false,"placeholder":"e.g. Premium package"},
    {"id":"package","order":4,"type":"select","label":"Package","required":false,"options":[],"optionsFrom":"seller_package_options","placeholder":"Select package"},
    {"id":"inclusions","order":5,"type":"textarea","label":"What''s included","required":false,"placeholder":"One item per line (e.g. chapel use, embalming)"},
    {"id":"who_this_is_for","order":6,"type":"textarea","label":"Who this is for","required":false,"placeholder":"Who should choose this package?"},
    {"id":"important_notes","order":7,"type":"textarea","label":"Important notes","required":false,"placeholder":"Pricing caveats, add-ons, availability..."},
    {"id":"base_price","order":8,"type":"number","label":"Starting price","required":false,"placeholder":"0"},
    {"id":"location","order":9,"type":"text","label":"Location","required":false,"placeholder":"e.g. Quezon City"},
    {"id":"featured","order":10,"type":"select","label":"Highlight as popular","required":false,"options":["no","yes"],"placeholder":"Select"},
    {"id":"status","order":11,"type":"select","label":"Status","required":false,"options":["active","draft","inactive","archived"],"placeholder":"Select status"}
  ]'::jsonb,
  updated_at = now()
where template_key = 'seller_new_listing';
