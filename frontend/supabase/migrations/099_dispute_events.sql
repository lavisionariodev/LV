-- ---------------------------------------------------------------------------
-- dispute_events: append-only audit log for a dispute (status changes, notes,
-- system events). Powers the timeline UI under /admin/disputes/[id].
--
-- This table is append-only by design — admins record an event each time they
-- transition a dispute or add a note. Old rows are never updated.
-- ---------------------------------------------------------------------------

create table if not exists public.dispute_events (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.disputes (id) on delete cascade,
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  actor_role text not null check (actor_role in ('admin', 'buyer', 'seller', 'system')),
  event_type text not null check (length(event_type) > 0),
  from_status text,
  to_status text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_dispute_events_dispute_id_created_at_desc
  on public.dispute_events (dispute_id, created_at desc);

alter table public.dispute_events enable row level security;

-- Admin: full access (the writers are server routes using service role, but
-- the policy keeps any future authenticated admin reads workable).
drop policy if exists "dispute_events_admin_all" on public.dispute_events;
create policy "dispute_events_admin_all"
  on public.dispute_events for all to authenticated
  using (exists (select 1 from public.admins a where a.id = auth.uid()))
  with check (exists (select 1 from public.admins a where a.id = auth.uid()));

-- Buyer / seller participants can read events for disputes they're part of.
drop policy if exists "dispute_events_participant_select" on public.dispute_events;
create policy "dispute_events_participant_select"
  on public.dispute_events for select to authenticated
  using (
    exists (
      select 1 from public.disputes d
      where d.id = dispute_events.dispute_id
        and (d.buyer_id = auth.uid() or d.seller_user_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Optional: ensure a `dispute-attachments` storage bucket exists for the
-- attachments grid in the admin disputes detail page. Idempotent.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'dispute-attachments') then
    begin
      perform storage.create_bucket('dispute-attachments', false);
    exception when others then
      -- Older Supabase versions: fall back to direct insert.
      insert into storage.buckets (id, name, public)
      values ('dispute-attachments', 'dispute-attachments', false)
      on conflict (id) do nothing;
    end;
  end if;
end$$;
