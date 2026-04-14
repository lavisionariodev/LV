-- Human-friendly display order number (keep UUID as primary key).
-- Format: LV-YYYY-000001 (global sequence per year).

create extension if not exists pgcrypto;

alter table public.orders
  add column if not exists order_number text;

-- Ensure uniqueness (allow null for existing rows until backfilled).
create unique index if not exists idx_orders_order_number_unique
  on public.orders (order_number)
  where order_number is not null;

-- Per-year counter table.
create table if not exists public.order_number_counters (
  year int primary key,
  last_value int not null default 0 check (last_value >= 0),
  updated_at timestamptz not null default now()
);

alter table public.order_number_counters enable row level security;

-- No client access to counters.
revoke all on table public.order_number_counters from public;
revoke all on table public.order_number_counters from anon, authenticated;

create or replace function public.assign_order_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year int := extract(year from coalesce(new.created_at, now()))::int;
  v_next int;
begin
  if new.order_number is not null and btrim(new.order_number) <> '' then
    return new;
  end if;

  insert into public.order_number_counters (year, last_value)
  values (v_year, 0)
  on conflict (year) do nothing;

  update public.order_number_counters
  set last_value = last_value + 1,
      updated_at = now()
  where year = v_year
  returning last_value into v_next;

  new.order_number := format('LV-%s-%s', v_year::text, lpad(v_next::text, 6, '0'));
  return new;
end;
$$;

drop trigger if exists trg_orders_assign_order_number on public.orders;
create trigger trg_orders_assign_order_number
before insert on public.orders
for each row execute function public.assign_order_number();

-- Backfill existing rows (oldest first) so UI can show uniform IDs.
do $$
declare
  r record;
  v_year int;
  v_next int;
begin
  for r in
    select id, created_at
    from public.orders
    where order_number is null or btrim(order_number) = ''
    order by created_at asc
  loop
    v_year := extract(year from coalesce(r.created_at, now()))::int;

    insert into public.order_number_counters (year, last_value)
    values (v_year, 0)
    on conflict (year) do nothing;

    update public.order_number_counters
    set last_value = last_value + 1,
        updated_at = now()
    where year = v_year
    returning last_value into v_next;

    update public.orders
    set order_number = format('LV-%s-%s', v_year::text, lpad(v_next::text, 6, '0'))
    where id = r.id;
  end loop;
end;
$$;

