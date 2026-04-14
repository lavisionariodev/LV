-- Add fulfillment + payment status fields to orders.
-- This keeps existing orders.status (legacy) for backward compatibility,
-- but new code should use fulfillment_status + payment_status.

alter table public.orders
  add column if not exists fulfillment_status text not null default 'pending'
    check (fulfillment_status in ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'expired'));

-- Backfill payment_status from legacy orders.status.
update public.orders
set payment_status = case status
  when 'paid' then 'paid'
  when 'failed' then 'failed'
  when 'cancelled' then 'expired'
  else 'unpaid'
end
where payment_status is null
   or payment_status = 'unpaid';

create index if not exists idx_orders_fulfillment_status
  on public.orders (fulfillment_status);

create index if not exists idx_orders_payment_status
  on public.orders (payment_status);

