-- Saved listings per buyer (wishlist). Denormalized fields mirror shop cards when saved.
CREATE TABLE public.favorite_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.seller_listings(id) ON DELETE CASCADE,
  package_option text NOT NULL DEFAULT '',
  listing_name text NOT NULL,
  base_price numeric(12,2),
  image_url text,
  service_id text NOT NULL,
  service_label text,
  business_name text,
  business_location text,
  seller_rating numeric(4,2),
  seller_reviews int,
  seller_badge text,
  popular boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, listing_id, package_option)
);

CREATE INDEX idx_favorite_items_user_id ON public.favorite_items(user_id);
CREATE INDEX idx_favorite_items_listing_id ON public.favorite_items(listing_id);

ALTER TABLE public.favorite_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own favorites"
  ON public.favorite_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
