-- Seller payout verification (admin review) and one in-flight withdrawal per seller.

alter table public.seller_payout_settings
  add column if not exists verification_status text not null default 'pending_review'
    check (verification_status in ('pending_review', 'approved', 'rejected'));

alter table public.seller_payout_settings
  add column if not exists verified_at timestamptz;

alter table public.seller_payout_settings
  add column if not exists verified_by uuid references public.admins (id) on delete set null;

alter table public.seller_payout_settings
  add column if not exists verification_rejection_reason text;

comment on column public.seller_payout_settings.verification_status is
  'Admin review gate for automated PayMongo withdrawals: pending_review, approved, rejected.';

comment on column public.seller_payout_settings.verified_by is
  'Admin who approved or rejected payout settings.';

-- Backfill: approve complete bank/gcash rows; approve manual with notes; else pending_review.
update public.seller_payout_settings s
set verification_status = 'approved',
    verified_at = coalesce(s.updated_at, s.created_at, now())
where verification_status = 'pending_review'
  and (
    (
      s.payout_method = 'bank'
      and coalesce(btrim(s.account_holder_name), '') <> ''
      and coalesce(btrim(s.bank_name), '') <> ''
      and coalesce(btrim(s.account_number), '') <> ''
    )
    or (
      s.payout_method = 'gcash'
      and coalesce(btrim(s.gcash_name), '') <> ''
      and coalesce(btrim(s.gcash_number), '') <> ''
    )
    or (
      s.payout_method = 'manual'
      and coalesce(btrim(s.notes), '') <> ''
    )
  );

-- One pending or submitted withdrawal per seller at a time.
create unique index if not exists idx_seller_withdrawals_one_in_flight_per_seller
  on public.seller_withdrawals (seller_user_id)
  where status in ('pending', 'submitted');
