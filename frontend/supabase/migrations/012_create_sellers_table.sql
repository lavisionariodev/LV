-- Create sellers table for business information and approval status
CREATE TABLE IF NOT EXISTS public.sellers (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  business_info TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

-- Policies: Sellers can read/update their own data; Admins can read/update all
CREATE POLICY "Sellers can read own seller data" ON public.sellers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Sellers can update own seller data" ON public.sellers
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all seller data" ON public.sellers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
  );

CREATE POLICY "Admins can update all seller data" ON public.sellers
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_sellers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sellers_updated_at
  BEFORE UPDATE ON public.sellers
  FOR EACH ROW
  EXECUTE FUNCTION update_sellers_updated_at();