-- Admin review fields for seller payout release requests.

alter table public.seller_payout_requests
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users (id) on delete set null,
  add column if not exists admin_note text;

comment on column public.seller_payout_requests.reviewed_at is
  'When an admin approved or rejected the payout request.';
comment on column public.seller_payout_requests.reviewed_by is
  'Admin auth user id who reviewed the request.';
comment on column public.seller_payout_requests.admin_note is
  'Admin note or rejection reason for the payout request.';
