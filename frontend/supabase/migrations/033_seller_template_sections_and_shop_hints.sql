-- Section groups (Basic / Sales / Others) + optional per-section tips for admin + seller UI.
-- Aligns seller_form_templates with NewListingClient sections and shop field usage.

alter table public.seller_form_templates
  add column if not exists section_config jsonb;

comment on column public.seller_form_templates.section_config is
  'JSON { "sections": [ { "id": "basic"|"sales"|"others", "label", "tipTitle", "tipBody", "shopGuide" } ] } for wizard headers and guidance.';

update public.seller_form_templates
set
  fields = '[
    {"id":"listing_name","order":0,"section":"basic","type":"text","label":"Listing name","required":true,"placeholder":"e.g. Memorial package — standard","sublabel":""},
    {"id":"description","order":1,"section":"basic","type":"textarea","label":"Description","required":false,"placeholder":"Describe what this listing offers","sublabel":"Shown on the shop listing"},
    {"id":"kind","order":2,"section":"basic","type":"select","label":"Kind","required":false,"options":["service","package"],"placeholder":"Select kind","sublabel":""},
    {"id":"category","order":3,"section":"basic","type":"text","label":"Category","required":false,"placeholder":"e.g. Memorial service","sublabel":""},
    {"id":"duration","order":4,"section":"basic","type":"text","label":"Duration","required":false,"placeholder":"e.g. 3–5 days","sublabel":""},
    {"id":"coverage","order":5,"section":"basic","type":"text","label":"Coverage","required":false,"placeholder":"e.g. Metro Manila (service area)","sublabel":"Service area"},
    {"id":"base_price","order":6,"section":"sales","type":"number","label":"Starting price (PHP)","required":true,"placeholder":"0","sublabel":""},
    {"id":"price_note","order":7,"section":"sales","type":"text","label":"Price note","required":false,"placeholder":"e.g. Indicative; extras billed separately","sublabel":"Optional"},
    {"id":"package_options","order":8,"section":"sales","type":"string_list","label":"Package options","required":false,"placeholder":"Buyer-facing label","sublabel":"Buyer-facing labels (e.g. tiers)"},
    {"id":"inclusions","order":9,"section":"others","type":"textarea","label":"What''s included","required":false,"placeholder":"One line per item","sublabel":"One line per item"},
    {"id":"who_this_is_for","order":10,"section":"others","type":"textarea","label":"Who this is for","required":false,"placeholder":"Describe the intended audience","sublabel":""},
    {"id":"important_notes","order":11,"section":"others","type":"textarea","label":"Important notes","required":false,"placeholder":"Policies, disclaimers, or extra charges","sublabel":""}
  ]'::jsonb,
  section_config = '{
    "sections": [
      {
        "id": "basic",
        "label": "Basic information",
        "tipTitle": "Listing basics",
        "tipBody": "Use clear photos and a descriptive name so buyers know what they get. Category, duration, and coverage help them compare options and find you in search.",
        "shopGuide": "Shop: listing title, description, images, kind/category, duration and coverage on cards and detail."
      },
      {
        "id": "sales",
        "label": "Sales information",
        "tipTitle": "Pricing and options",
        "tipBody": "Set a starting price buyers can trust. Use price notes for caveats. Package options power the buyer package dropdown on the shop detail page.",
        "shopGuide": "Shop: price, package picker when options exist, notes near price in cart and detail."
      },
      {
        "id": "others",
        "label": "Others",
        "tipTitle": "Inclusions and policies",
        "tipBody": "Spell out what is included, who the service is for, and any important notes or disclaimers. Clear expectations reduce questions later.",
        "shopGuide": "Shop: inclusions list, audience, policies on listing detail and compare."
      }
    ]
  }'::jsonb,
  updated_at = now()
where template_key = 'seller_new_listing';
