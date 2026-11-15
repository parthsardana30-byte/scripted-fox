BEGIN;
ALTER TABLE billing_payments
  ADD COLUMN IF NOT EXISTS credit_pack_id text,
  ADD COLUMN IF NOT EXISTS credit_amount integer,
  ADD COLUMN IF NOT EXISTS credit_period_end timestamptz;
COMMIT;
