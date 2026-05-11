-- Add editable testimonial author metadata for About page cards.
alter table public.site_content
  add column if not exists about_testimonial_1_name text,
  add column if not exists about_testimonial_1_location text,
  add column if not exists about_testimonial_2_name text,
  add column if not exists about_testimonial_2_location text,
  add column if not exists about_testimonial_3_name text,
  add column if not exists about_testimonial_3_location text;

