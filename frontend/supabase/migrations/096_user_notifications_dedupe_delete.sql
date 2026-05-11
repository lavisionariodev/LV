-- Dedupe key for idempotent notification inserts (webhook retries, duplicate API calls).
alter table public.user_notifications
  add column if not exists dedupe_key text;

comment on column public.user_notifications.dedupe_key is
  'Optional stable key per recipient; unique with user_id when set, for insert deduplication.';

create unique index if not exists idx_user_notifications_user_dedupe
  on public.user_notifications (user_id, dedupe_key)
  where dedupe_key is not null and length(trim(dedupe_key)) > 0;

-- Allow signed-in users to delete their own notification rows (clear one / clear all in UI).
drop policy if exists "user_notifications_delete_own" on public.user_notifications;
create policy "user_notifications_delete_own"
  on public.user_notifications for delete to authenticated
  using (user_id = auth.uid());
