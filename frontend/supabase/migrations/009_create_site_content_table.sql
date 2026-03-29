-- Create site_content table for global site copy management.
-- Run this in Supabase Dashboard → SQL Editor (or via `supabase db push`).

CREATE TABLE IF NOT EXISTS public.site_content (
  id text PRIMARY KEY,
  system_name text,

  hero_title text,
  hero_subheading text,
  hero_primary_cta text,

  footer_tagline text,
  footer_support_phone text,
  footer_support_email text,
  footer_copyright_text text,

  about_our_story text,
  about_mission_vision text,
  about_why_us text,
  about_partners text,
  about_commitment text,

  how_step_by_step text,
  how_compare_packages text,
  how_book_service text,
  how_payment_support text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.site_content IS 'Singleton style site content row for homepage/cms fields.';

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read site content (public site data).
DROP POLICY IF EXISTS "Public can read site content" ON public.site_content;
CREATE POLICY "Public can read site content"
  ON public.site_content
  FOR SELECT
  USING (true);

-- Allow authenticated admins to insert/update site content.
-- Update this if you have stricter admin policies in your app.
DROP POLICY IF EXISTS "Authenticated can upsert site content" ON public.site_content;
CREATE POLICY "Authenticated can upsert site content"
  ON public.site_content
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Ensure the global row exists for consistent queries.
INSERT INTO public.site_content (id)
VALUES ('global')
ON CONFLICT (id) DO NOTHING;

-- Optional: trigger to auto-updated updated_at.
CREATE OR REPLACE FUNCTION public.site_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS site_content_updated_at_trigger ON public.site_content;
CREATE TRIGGER site_content_updated_at_trigger
  BEFORE UPDATE ON public.site_content
  FOR EACH ROW
  EXECUTE FUNCTION public.site_content_updated_at();

-- Ensure new columns are available, and keep safe for fresh install
ALTER TABLE public.site_content
  ADD COLUMN IF NOT EXISTS about_why_us text;
ALTER TABLE public.site_content
  ADD COLUMN IF NOT EXISTS about_commitment text;
