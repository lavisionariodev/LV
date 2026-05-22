-- Persist seller display fields on cart lines for checkout/cart UI (avatar from profiles.avatar_url).
ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS seller_name text,
  ADD COLUMN IF NOT EXISTS seller_avatar_url text;
