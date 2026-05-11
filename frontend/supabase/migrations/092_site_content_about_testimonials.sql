  -- Add editable About-page testimonial copy fields for admin site content.
  alter table public.site_content
    add column if not exists about_testimonial_1 text,
    add column if not exists about_testimonial_2 text,
    add column if not exists about_testimonial_3 text,
    add column if not exists about_testimonial_featured text;