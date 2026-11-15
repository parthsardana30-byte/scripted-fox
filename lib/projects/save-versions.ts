import "server-only";
import type { PoolClient } from "pg";
import type { StoredScriptVersion } from "./types";

// Called inside the project transaction. One insert regardless of version count.
export async function replaceScriptVersions(client: Pick<PoolClient, "query">, userId: string, scriptId: string, versions: StoredScriptVersion[]) {
  await client.query("DELETE FROM script_versions WHERE script_id = $1 AND user_id = $2", [scriptId, userId]);
  await client.query(
    `INSERT INTO script_versions (user_id, script_id, version, label, snapshot, origin, created_at)
     SELECT $1, $2, v.number, v.label, v.snapshot, v.origin, v."createdAt"
     FROM jsonb_to_recordset($3::jsonb) AS v(number integer, label text, snapshot jsonb, origin text, "createdAt" timestamptz)`,
    [userId, scriptId, JSON.stringify(versions)],
  );
}
