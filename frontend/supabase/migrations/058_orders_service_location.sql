-- Add service_location to orders and wire it into checkout RPC.

alter table public.orders
  add column if not exists service_location text;

