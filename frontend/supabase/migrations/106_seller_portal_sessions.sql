-- Seller Centre browser sessions tracked for settings visibility (not device binding).

create table if not exists public.seller_portal_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  auth_session_id text not null,
  device_label text not null default 'Unknown browser',
  user_agent text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, auth_session_id)
);

create index if not exists idx_seller_portal_sessions_user_last_seen
  on public.seller_portal_sessions (user_id, last_seen_at desc);

comment on table public.seller_portal_sessions is
  'Seller Centre browser sessions recorded on portal use. Accessed only via service role in API routes.';

alter table public.seller_portal_sessions enable row level security;
