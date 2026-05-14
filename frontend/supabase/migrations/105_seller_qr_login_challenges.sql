-- Seller desktop QR login: pending challenges approved from the mobile/PWA app.

create table if not exists public.seller_qr_login_challenges (
  id uuid primary key default gen_random_uuid(),
  portal text not null default 'seller'
    check (portal = 'seller'),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'consumed', 'expired', 'denied')),
  approve_token_hash text not null,
  poll_secret_hash text not null,
  redirect_path text,
  approved_user_id uuid references auth.users (id) on delete set null,
  magiclink_token_hash text,
  expires_at timestamptz not null,
  approved_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_seller_qr_login_challenges_expires_at
  on public.seller_qr_login_challenges (expires_at);

create index if not exists idx_seller_qr_login_challenges_status
  on public.seller_qr_login_challenges (status);

create index if not exists idx_seller_qr_login_challenges_approve_token_hash
  on public.seller_qr_login_challenges (approve_token_hash);

comment on table public.seller_qr_login_challenges is
  'Pending seller QR login challenges. Accessed only via service role in API routes.';

alter table public.seller_qr_login_challenges enable row level security;
