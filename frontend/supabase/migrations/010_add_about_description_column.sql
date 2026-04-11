-- Add about_description column to site_content table for About Us section description.
-- Run this in Supabase Dashboard → SQL Editor (or via `supabase db push`).
-- Fresh installs also define this column in 009_create_site_content_table.sql; this ALTER stays
-- for databases that applied an older 009 before about_description existed.

ALTER TABLE public.site_content
  ADD COLUMN IF NOT EXISTS about_description text;

COMMENT ON COLUMN public.site_content.about_description IS 'Main description for the About Us section';
