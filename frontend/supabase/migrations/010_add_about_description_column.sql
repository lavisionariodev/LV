-- Add about_description column to site_content table for About Us section description.
-- Run this in Supabase Dashboard → SQL Editor (or via `supabase db push`).

ALTER TABLE public.site_content
  ADD COLUMN IF NOT EXISTS about_description text;

COMMENT ON COLUMN public.site_content.about_description IS 'Main description for the About Us section';
