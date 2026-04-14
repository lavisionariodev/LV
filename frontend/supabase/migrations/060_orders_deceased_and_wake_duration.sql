-- Add buyer-provided deceased details and wake duration to orders.

alter table public.orders
  add column if not exists deceased_name text,
  add column if not exists date_of_death date,
  add column if not exists wake_duration_days int check (wake_duration_days is null or wake_duration_days >= 0);

