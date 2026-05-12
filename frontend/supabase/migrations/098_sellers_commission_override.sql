-- Adds per-seller commission override column.
-- NULL means "use the platform default rate from platform_billing.default_commission_percent".
-- When set, this rate is applied at escrow creation (PayMongo webhook) and exposed via /api/admin/payouts.

alter table public.sellers
  add column if not exists commission_percent_override numeric(5, 2)
    check (
      commission_percent_override is null
      or (commission_percent_override >= 0 and commission_percent_override <= 100)
    );

comment on column public.sellers.commission_percent_override is
  'Optional per-seller commission rate in percent. NULL means use platform_billing.default_commission_percent. Snapshotted into order_escrows.commission_rate_percent at escrow creation.';
