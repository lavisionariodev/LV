-- Listing-level admin approval workflow fields.
-- Separate from seller-controlled `status` (draft/active/inactive/archived).

alter table public.seller_listings
  add column if not exists approval_status text not null default 'draft'
    check (approval_status in ('draft', 'pending', 'approved', 'rejected')),
  add column if not exists submitted_at timestamptz null,
  add column if not exists reviewed_at timestamptz null,
  add column if not exists reviewed_by uuid null references auth.users(id) on delete set null,
  add column if not exists rejection_reason text null;

create index if not exists idx_seller_listings_approval_status
  on public.seller_listings (approval_status);

create index if not exists idx_seller_listings_submitted_at
  on public.seller_listings (submitted_at desc);

create index if not exists idx_seller_listings_reviewed_at
  on public.seller_listings (reviewed_at desc);

-- Backfill for existing rows:
-- - If the listing is already Active, treat it as Approved so it remains visible after the shop RPC gate is tightened.
-- - Otherwise treat as Draft.
update public.seller_listings
set
  approval_status = case
    when coalesce(nullif(trim(status), ''), 'draft') = 'active' then 'approved'
    else 'draft'
  end,
  reviewed_at = case
    when coalesce(nullif(trim(status), ''), 'draft') = 'active' then now()
    else reviewed_at
  end
where approval_status is null
   or approval_status not in ('draft', 'pending', 'approved', 'rejected');

