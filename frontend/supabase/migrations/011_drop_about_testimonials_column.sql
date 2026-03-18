-- Drop unused about_testimonials column from site_content.
-- Run this in Supabase Dashboard → SQL Editor (or via `supabase db push`).

ALTER TABLE public.site_content
  DROP COLUMN IF EXISTS about_testimonials;
