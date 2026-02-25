-- Cart items: one row per product in the cart, per user.
-- Run in Supabase Dashboard → SQL Editor (or via supabase db push).
CREATE TABLE public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  name text NOT NULL,
  image_url text,
  price numeric(12,2),
  description text,
  quantity int NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own cart"
  ON public.cart_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_cart_items_user_id ON public.cart_items(user_id);
