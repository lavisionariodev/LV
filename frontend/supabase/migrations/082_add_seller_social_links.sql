-- Add seller social links for public “Message / Chat now” modal.
-- Stored in sellers to keep write path simple; exposed to anon only via SECURITY DEFINER RPCs.

alter table public.sellers
  add column if not exists social_links jsonb not null default '{}'::jsonb;

