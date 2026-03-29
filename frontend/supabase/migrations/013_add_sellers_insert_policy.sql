-- Add missing INSERT policy for sellers to insert their own data
CREATE POLICY "Sellers can insert own seller data" ON public.sellers
  FOR INSERT WITH CHECK (auth.uid() = user_id);