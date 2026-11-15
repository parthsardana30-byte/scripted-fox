BEGIN;

DO $$
DECLARE
  credit_columns_already_existed boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'billing_accounts' AND column_name = 'credits_allowance'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'billing_accounts' AND column_name = 'credits_remaining'
  ) INTO credit_columns_already_existed;

  ALTER TABLE billing_accounts
    ADD COLUMN IF NOT EXISTS credits_allowance integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS credits_remaining integer NOT NULL DEFAULT 0;

  IF NOT credit_columns_already_existed THEN
    UPDATE billing_accounts
    SET credits_allowance = CASE plan_code
        WHEN 'elite' THEN 8000
        WHEN 'pro' THEN CASE WHEN status = 'trialing' THEN 500 ELSE 3000 END
        ELSE 0
      END,
      credits_remaining = CASE plan_code
        WHEN 'elite' THEN 8000
        WHEN 'pro' THEN CASE WHEN status = 'trialing' THEN 500 ELSE 3000 END
        ELSE 0
      END;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  project_id uuid NOT NULL UNIQUE,
  active_version integer NOT NULL DEFAULT 1 CHECK (active_version > 0),
  word_count integer NOT NULL DEFAULT 0 CHECK (word_count >= 0),
  estimated_duration_seconds integer,
  document jsonb NOT NULL DEFAULT '{"title":"Untitled script","author":"","draft":{"title":"Untitled script","sections":[{"label":"Script","body":""}]}}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (project_id, user_id) REFERENCES projects(id, user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS scripts_user_updated_idx ON scripts(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS script_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  script_id uuid NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  label text NOT NULL,
  snapshot jsonb NOT NULL,
  origin text NOT NULL CHECK (origin IN ('initial', 'ai', 'restore')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (script_id, version)
);

CREATE INDEX IF NOT EXISTS script_versions_script_idx ON script_versions(script_id, version DESC);

COMMIT;
