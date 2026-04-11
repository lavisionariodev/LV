-- Admin notification channel preferences (per category: push, email; SMS reserved for future use).
-- Run in Supabase Dashboard → SQL Editor (or via `supabase db push`).

alter table public.admins
  add column if not exists notification_preferences jsonb not null default '{}'::jsonb;

comment on column public.admins.notification_preferences is
  'JSON map of category keys (order, approval, alert, announcement) to { push, email, sms } booleans.';
