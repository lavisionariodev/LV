-- Active buyers only: order reads and dispute reads via client; dispute inserts are API-only (service role).

drop policy if exists "buyer_read_own_orders" on public.orders;
create policy "buyer_read_own_orders"
  on public.orders
  for select
  to authenticated
  using (
    buyer_id = auth.uid()
    and exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role = 'buyer'
        and u.status = 'active'
    )
  );

drop policy if exists "disputes_buyer_insert_own" on public.disputes;

drop policy if exists "disputes_buyer_select_own" on public.disputes;
create policy "disputes_buyer_select_own"
  on public.disputes
  for select
  to authenticated
  using (
    buyer_id = auth.uid()
    and exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role = 'buyer'
        and u.status = 'active'
    )
  );
