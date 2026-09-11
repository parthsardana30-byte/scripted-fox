CREATE TABLE IF NOT EXISTS ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 180),
  angle text NOT NULL CHECK (char_length(angle) BETWEEN 1 AND 1000),
  format text NOT NULL CHECK (char_length(format) BETWEEN 1 AND 120),
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 2000),
  status text NOT NULL DEFAULT 'recommended'
    CHECK (status IN ('recommended', 'saved', 'dismissed', 'used')),
  recommendation_batch_id uuid,
  creator_profile_version integer,
  generation_version text,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id)
);

CREATE INDEX IF NOT EXISTS ideas_user_created_idx
  ON ideas(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ideas_user_batch_idx
  ON ideas(user_id, recommendation_batch_id);

CREATE TABLE IF NOT EXISTS idea_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  idea_id uuid NOT NULL,
  source text NOT NULL CHECK (source IN ('channel', 'youtube_trend')),
  label text NOT NULL,
  value text NOT NULL,
  explanation text,
  source_snapshot_id uuid,
  captured_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (idea_id, user_id) REFERENCES ideas(id, user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idea_evidence_idea_idx ON idea_evidence(idea_id);

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  source_idea_id uuid,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 180),
  status text NOT NULL DEFAULT 'idea'
    CHECK (status IN ('idea', 'planning', 'writing', 'ready_to_record', 'complete')),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id),
  FOREIGN KEY (source_idea_id, user_id) REFERENCES ideas(id, user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS projects_user_updated_idx
  ON projects(user_id, updated_at DESC);
