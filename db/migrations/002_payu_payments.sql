CREATE TABLE IF NOT EXISTS billing_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'payu',
  transaction_id text NOT NULL UNIQUE,
  provider_payment_id text,
  plan_code text NOT NULL,
  billing_period text NOT NULL,
  amount_inr numeric(10, 2) NOT NULL,
  product_info text NOT NULL,
  customer_email text NOT NULL,
  customer_firstname text NOT NULL,
  customer_phone text NOT NULL,
  status text NOT NULL DEFAULT 'created',
  bank_reference text,
  error_code text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS billing_payments_user_created_idx
  ON billing_payments(user_id, created_at DESC);
