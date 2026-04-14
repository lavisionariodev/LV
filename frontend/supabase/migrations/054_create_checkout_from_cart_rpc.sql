-- Transactional checkout creation from a buyer's cart.
-- Creates one order per seller, inserts order_items, and clears selected cart items.

create or replace function public.create_checkout_from_cart(
  p_buyer_id uuid,
  p_product_ids text[] default null,
  p_contact jsonb default '{}'::jsonb
)
returns table (
  order_ids uuid[],
  amount numeric,
  currency text,
  line_items jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_ids uuid[];
  v_amount numeric(12,2);
  v_currency text := 'PHP';
  v_line_items jsonb;
begin
  -- Prevent cross-user checkout when called with authenticated context.
  if auth.uid() is not null and auth.uid() <> p_buyer_id then
    raise exception 'Not allowed to create checkout for another user.';
  end if;

  with selected_cart as (
    select
      ci.id as cart_row_id,
      ci.user_id,
      ci.product_id,
      ci.quantity,
      sl.id as listing_id,
      sl.seller_user_id,
      sl.listing_name,
      sl.base_price
    from public.cart_items ci
    inner join public.seller_listings sl
      on sl.id::text = ci.product_id
    where ci.user_id = p_buyer_id
      and (p_product_ids is null or ci.product_id = any(p_product_ids))
      and sl.status = 'active'
      and sl.approval_status = 'approved'
  ),
  invalid as (
    select *
    from selected_cart
    where base_price is null or base_price <= 0
  ),
  ensure_non_empty as (
    select count(*)::int as ct from selected_cart
  )
  select
    array_agg(distinct listing_id::uuid) filter (where false), -- placeholder, replaced later
    null::numeric,
    null::text,
    null::jsonb
  into v_order_ids, v_amount, v_currency, v_line_items
  from ensure_non_empty;

  if (select ct from (select count(*)::int as ct from (
        select 1 from public.cart_items ci
        where ci.user_id = p_buyer_id
          and (p_product_ids is null or ci.product_id = any(p_product_ids))
      ) x) t) = 0 then
    raise exception 'Your cart is empty (or no items selected).';
  end if;

  if exists (select 1 from (
    select sl.id
    from public.cart_items ci
    left join public.seller_listings sl on sl.id::text = ci.product_id
    where ci.user_id = p_buyer_id
      and (p_product_ids is null or ci.product_id = any(p_product_ids))
      and (sl.id is null or sl.status <> 'active' or sl.approval_status <> 'approved')
    limit 1
  ) bad) then
    raise exception 'Some selected items are no longer available.';
  end if;

  if exists (select 1 from invalid limit 1) then
    raise exception 'Some selected items require manual pricing and cannot be paid for online.';
  end if;

  with selected_cart as (
    select
      ci.id as cart_row_id,
      ci.user_id,
      ci.product_id,
      ci.quantity,
      sl.id as listing_id,
      sl.seller_user_id,
      sl.listing_name,
      sl.base_price
    from public.cart_items ci
    inner join public.seller_listings sl
      on sl.id::text = ci.product_id
    where ci.user_id = p_buyer_id
      and (p_product_ids is null or ci.product_id = any(p_product_ids))
      and sl.status = 'active'
      and sl.approval_status = 'approved'
  ),
  per_seller as (
    select
      seller_user_id,
      sum((base_price::numeric) * (quantity::numeric))::numeric(12,2) as seller_subtotal
    from selected_cart
    group by seller_user_id
  ),
  inserted_orders as (
    insert into public.orders (
      buyer_id,
      seller_user_id,
      status,
      currency,
      subtotal,
      contact_name,
      contact_email,
      contact_phone,
      preferred_date,
      notes
    )
    select
      p_buyer_id,
      ps.seller_user_id,
      'pending_payment',
      v_currency,
      ps.seller_subtotal,
      nullif(btrim(coalesce(p_contact->>'contact_name', '')), ''),
      nullif(btrim(coalesce(p_contact->>'contact_email', '')), ''),
      nullif(btrim(coalesce(p_contact->>'contact_phone', '')), ''),
      nullif(btrim(coalesce(p_contact->>'preferred_date', '')), '')::date,
      nullif(btrim(coalesce(p_contact->>'notes', '')), '')
    from per_seller ps
    returning *
  ),
  inserted_items as (
    insert into public.order_items (
      order_id,
      product_id,
      name,
      price,
      quantity,
      seller_user_id
    )
    select
      o.id as order_id,
      sc.product_id,
      sc.listing_name,
      sc.base_price,
      sc.quantity,
      sc.seller_user_id
    from selected_cart sc
    inner join inserted_orders o
      on o.seller_user_id = sc.seller_user_id
    returning *
  ),
  deleted_cart as (
    delete from public.cart_items ci
    where ci.user_id = p_buyer_id
      and (p_product_ids is null or ci.product_id = any(p_product_ids))
    returning ci.product_id
  )
  select
    array_agg(o.id order by o.created_at) as order_ids,
    sum(o.subtotal)::numeric(12,2) as amount,
    v_currency as currency,
    jsonb_agg(
      jsonb_build_object(
        'order_id', o.id,
        'seller_user_id', o.seller_user_id,
        'subtotal', o.subtotal
      )
      order by o.created_at
    ) as line_items
  into v_order_ids, v_amount, v_currency, v_line_items
  from inserted_orders o;

  if v_order_ids is null or array_length(v_order_ids, 1) is null then
    raise exception 'Failed to create orders from cart.';
  end if;

  return query
  select v_order_ids, v_amount, v_currency, coalesce(v_line_items, '[]'::jsonb);
end;
$$;

revoke all on function public.create_checkout_from_cart(uuid, text[], jsonb) from public;
grant execute on function public.create_checkout_from_cart(uuid, text[], jsonb) to authenticated;

