-- Fix: create_checkout_from_cart() referenced listing_id outside scope.
-- This migration replaces the function with a corrected version.

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
  v_currency text := 'PHP';
  v_count int := 0;
  v_has_unavailable boolean := false;
  v_has_manual_pricing boolean := false;
begin
  -- Prevent cross-user checkout when called with authenticated context.
  if auth.uid() is not null and auth.uid() <> p_buyer_id then
    raise exception 'Not allowed to create checkout for another user.';
  end if;

  select count(*)::int
  into v_count
  from public.cart_items ci
  where ci.user_id = p_buyer_id
    and (p_product_ids is null or ci.product_id = any(p_product_ids));

  if v_count = 0 then
    raise exception 'Your cart is empty (or no items selected).';
  end if;

  -- Unavailable if listing missing, inactive, or not approved.
  select exists (
    select 1
    from public.cart_items ci
    left join public.seller_listings sl on sl.id::text = ci.product_id
    where ci.user_id = p_buyer_id
      and (p_product_ids is null or ci.product_id = any(p_product_ids))
      and (
        sl.id is null
        or sl.status <> 'active'
        or sl.approval_status <> 'approved'
      )
    limit 1
  )
  into v_has_unavailable;

  if v_has_unavailable then
    raise exception 'Some selected items are no longer available.';
  end if;

  -- Manual pricing: base_price null/<=0
  select exists (
    select 1
    from public.cart_items ci
    inner join public.seller_listings sl on sl.id::text = ci.product_id
    where ci.user_id = p_buyer_id
      and (p_product_ids is null or ci.product_id = any(p_product_ids))
      and (sl.base_price is null or sl.base_price <= 0)
    limit 1
  )
  into v_has_manual_pricing;

  if v_has_manual_pricing then
    raise exception 'Some selected items require manual pricing and cannot be paid for online.';
  end if;

  return query
  with selected_cart as (
    select
      ci.product_id,
      ci.quantity,
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
    returning 1
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
  from inserted_orders o;
end;
$$;

revoke all on function public.create_checkout_from_cart(uuid, text[], jsonb) from public;
grant execute on function public.create_checkout_from_cart(uuid, text[], jsonb) to authenticated;

