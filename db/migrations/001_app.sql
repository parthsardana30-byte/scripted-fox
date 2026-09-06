CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS profiles (
  id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  content_languages text[] NOT NULL DEFAULT ARRAY['en'],
  target_markets text[] NOT NULL DEFAULT ARRAY['US'],
  default_script_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  export_defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing_accounts (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  plan_code text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'free',
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  operation text NOT NULL,
  provider text,
  model text,
  input_units integer,
  output_units integer,
  cost_microunits bigint,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS usage_events_user_operation_created_idx ON usage_events(user_id, operation, created_at DESC);

CREATE TABLE IF NOT EXISTS youtube_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
  channel_id text,
  channel_title text,
  channel_thumbnail_url text,
  status text NOT NULL DEFAULT 'connecting',
  scopes text[] NOT NULL DEFAULT '{}',
  token_expires_at timestamptz,
  last_synced_at timestamptz,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS youtube_credentials (
  connection_id uuid PRIMARY KEY REFERENCES youtube_connections(id) ON DELETE CASCADE,
  ciphertext_base64 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS channel_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES youtube_connections(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  metrics jsonb NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS channel_snapshots_lookup_idx ON channel_snapshots(user_id, captured_at DESC);

CREATE TABLE IF NOT EXISTS video_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES youtube_connections(id) ON DELETE CASCADE,
  youtube_video_id text NOT NULL,
  title text NOT NULL,
  published_at timestamptz,
  metrics jsonb NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trend_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  market text NOT NULL,
  language text NOT NULL,
  niche text NOT NULL,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  evidence jsonb NOT NULL,
  confidence double precision,
  captured_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trend_snapshots_lookup_idx ON trend_snapshots(niche, market, language, captured_at DESC);

INSERT INTO profiles (id, display_name, avatar_url)
SELECT id, name, image FROM "user" ON CONFLICT (id) DO NOTHING;
INSERT INTO user_preferences (user_id)
SELECT id FROM "user" ON CONFLICT (user_id) DO NOTHING;
INSERT INTO billing_accounts (user_id, plan_code, status, trial_ends_at)
SELECT id, 'pro', 'trialing', now() + interval '7 days' FROM "user" ON CONFLICT (user_id) DO NOTHING;
