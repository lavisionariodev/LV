-- Track Seller Centre sign-ins per device (client IP), not per auth session.

alter table public.seller_portal_sessions
  add column if not exists device_key text;

-- Drop session-based rows; they are recreated on the next portal visit with device keys.
delete from public.seller_portal_sessions;

alter table public.seller_portal_sessions
  alter column device_key set not null;

alter table public.seller_portal_sessions
  drop constraint if exists seller_portal_sessions_user_id_auth_session_id_key;

alter table public.seller_portal_sessions
  add constraint seller_portal_sessions_user_id_device_key_key unique (user_id, device_key);

comment on column public.seller_portal_sessions.device_key is
  'Stable hash of user_id and client IP; one list entry per device/network location.';

comment on table public.seller_portal_sessions is
  'Seller Centre devices (by IP) recorded on portal use. Accessed only via service role in API routes.';
