-- ============================================================
-- Fix: Allow buyers to read their own order_items via RLS.
--
-- Without this policy, the anon Supabase client in the
-- purchases page silently returns [] for order_items, causing
-- orderItemsForReview to be empty and the Leave a Review modal
-- to fail with "Invalid orderId." or show nothing to submit.
--
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

drop policy if exists "buyer_select_own_order_items" on public.order_items;

create policy "buyer_select_own_order_items"
  on public.order_items
  for select
  to authenticated
  using (
    order_id in (
      select id from public.orders where buyer_id = auth.uid()
    )
  );