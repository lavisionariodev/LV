-- Optional SMS contact number for admin profile (e.g. notification SMS).
-- Run in Supabase Dashboard → SQL Editor (or via `supabase db push`).

alter table public.admins
  add column if not exists sms_phone text;

comment on column public.admins.sms_phone is
  'SMS contact number for the admin account (optional).';
