BEGIN;

-- Older development builds allowed the same channel to be connected more than
-- once. The first connection remains authoritative; later claims are placed in
-- a reversible quarantine without deleting credentials, analytics, scripts, or
-- other account-owned work.
ALTER TABLE youtube_connections
  ADD COLUMN IF NOT EXISTS blocked_channel_id text;

CREATE TEMP TABLE duplicate_youtube_connections ON COMMIT DROP AS
SELECT id, channel_id
FROM (
  SELECT
    id,
    channel_id,
    ROW_NUMBER() OVER (
      PARTITION BY channel_id
      ORDER BY created_at ASC, id ASC
    ) AS claim_order
  FROM youtube_connections
  WHERE channel_id IS NOT NULL
) claims
WHERE claim_order > 1;

UPDATE youtube_connections AS connection
SET
  blocked_channel_id = duplicates.channel_id,
  channel_id = NULL,
  status = 'error',
  last_error_code = 'duplicate_channel_claim',
  updated_at = now()
FROM duplicate_youtube_connections AS duplicates
WHERE connection.id = duplicates.id;

CREATE UNIQUE INDEX IF NOT EXISTS youtube_connections_channel_id_unique
  ON youtube_connections(channel_id)
  WHERE channel_id IS NOT NULL;

COMMIT;
