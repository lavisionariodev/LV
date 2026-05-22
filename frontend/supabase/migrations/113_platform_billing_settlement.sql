-- Structured settlement destination for platform commission (company treasury).
-- Complements settlement_notes; used by admin Billing settings.

alter table public.platform_billing
  add column if not exists settlement_method text default 'bank'
    check (settlement_method is null or settlement_method in ('bank', 'gcash', 'manual')),
  add column if not exists settlement_account_holder_name text,
  add column if not exists settlement_bank_name text,
  add column if not exists settlement_account_number text,
  add column if not exists settlement_gcash_name text,
  add column if not exists settlement_gcash_number text;

comment on column public.platform_billing.settlement_method is
  'Where platform commission settles: bank, gcash, or manual instructions.';
comment on column public.platform_billing.settlement_account_holder_name is
  'Bank account holder for platform commission settlement.';
comment on column public.platform_billing.settlement_bank_name is
  'Bank name for platform commission settlement.';
comment on column public.platform_billing.settlement_account_number is
  'Bank account number for platform commission settlement.';
comment on column public.platform_billing.settlement_gcash_name is
  'GCash display name for platform commission settlement.';
comment on column public.platform_billing.settlement_gcash_number is
  'GCash mobile for platform commission settlement.';
