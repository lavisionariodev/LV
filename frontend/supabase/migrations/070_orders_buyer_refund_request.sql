-- Buyer cancellation + refund tracking (paid orders before seller confirms fulfillment).

alter table public.orders
  drop constraint if exists orders_payment_status_check;

alter table public.orders
  add constraint orders_payment_status_check
  check (
    payment_status = any (
      array[
        'unpaid'::text,
        'pending'::text,
        'paid'::text,
        'failed'::text,
        'expired'::text,
        'refund_pending'::text,
        'refunded'::text
      ]
    )
  );

alter table public.orders
  add column if not exists refund_status text null
    check (
      refund_status is null or refund_status = any (
        array['requested', 'processing', 'completed', 'declined']::text[]
      )
    ),
  add column if not exists refund_requested_at timestamptz null;

comment on column public.orders.refund_status is
  'Buyer refund pipeline after cancelling a paid order before provider confirmation.';
comment on column public.orders.refund_requested_at is
  'When the buyer submitted cancellation/refund request.';

create index if not exists idx_orders_refund_open_seller
  on public.orders (seller_user_id, refund_requested_at desc)
  where refund_status is not null and refund_status in ('requested', 'processing');
