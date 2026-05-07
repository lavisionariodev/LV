-- Buyer order-item-level reviews/rating (supports edit/update).
-- One buyer can review each purchased order_item once (upserted for edits).

create table if not exists public.order_item_reviews (
  id uuid primary key default gen_random_uuid(),

  buyer_id uuid not null references public.users(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,

  seller_user_id uuid not null references public.sellers(user_id) on delete restrict,

  -- Aggregation fields (service page + seller page)
  service_id text not null,
  listing_label text not null,

  rating int not null check (rating >= 1 and rating <= 5),
  review_text text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint order_item_reviews_unique_per_buyer unique (buyer_id, order_item_id)
);

create index if not exists idx_order_item_reviews_order_item_id
  on public.order_item_reviews (order_item_id);

create index if not exists idx_order_item_reviews_buyer_id_created_at
  on public.order_item_reviews (buyer_id, created_at desc);

create index if not exists idx_order_item_reviews_seller_user_id_created_at
  on public.order_item_reviews (seller_user_id, created_at desc);

create index if not exists idx_order_item_reviews_service_id_created_at
  on public.order_item_reviews (service_id, created_at desc);

alter table public.order_item_reviews enable row level security;

-- Buyer can manage/select only their own reviews.
drop policy if exists "buyer_select_own_order_item_reviews" on public.order_item_reviews;
create policy "buyer_select_own_order_item_reviews"
  on public.order_item_reviews
  for select
  to authenticated
  using (auth.uid() = buyer_id);

drop policy if exists "buyer_insert_own_order_item_reviews" on public.order_item_reviews;
create policy "buyer_insert_own_order_item_reviews"
  on public.order_item_reviews
  for insert
  to authenticated
  with check (auth.uid() = buyer_id);

drop policy if exists "buyer_update_own_order_item_reviews" on public.order_item_reviews;
create policy "buyer_update_own_order_item_reviews"
  on public.order_item_reviews
  for update
  to authenticated
  using (auth.uid() = buyer_id)
  with check (auth.uid() = buyer_id);

-- Seller can read reviews tied to their fulfilled orders (useful for future UI without admin endpoints).
drop policy if exists "seller_select_order_item_reviews" on public.order_item_reviews;
create policy "seller_select_order_item_reviews"
  on public.order_item_reviews
  for select
  to authenticated
  using (seller_user_id = auth.uid());

drop trigger if exists trg_order_item_reviews_updated_at on public.order_item_reviews;
create trigger trg_order_item_reviews_updated_at
before update on public.order_item_reviews
for each row execute function public.set_updated_at();