BEGIN;
CREATE TABLE IF NOT EXISTS thumbnail_jobs (
  id uuid NOT NULL,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  request_hash text NOT NULL,
  topic text NOT NULL,
  quota_day date NOT NULL,
  cost integer NOT NULL CHECK (cost IN (0, 10)),
  billed_period_end timestamptz,
  status text NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed')),
  image bytea,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id),
  CHECK (image IS NULL OR octet_length(image) <= 8388608)
);
CREATE UNIQUE INDEX IF NOT EXISTS thumbnail_one_pending_user ON thumbnail_jobs(user_id) WHERE status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS thumbnail_one_free_day ON thumbnail_jobs(user_id, quota_day)
  WHERE cost = 0 AND status IN ('pending', 'succeeded');
CREATE INDEX IF NOT EXISTS thumbnail_user_created ON thumbnail_jobs(user_id, created_at DESC);
COMMIT;
