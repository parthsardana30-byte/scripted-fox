import "server-only";
import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { databasePool } from "@/lib/db/pool";
import { ThumbnailError, thumbnailConfigured } from "./provider";
import { THUMBNAIL_CREDITS, thumbnailDay, type ThumbnailInput, type ThumbnailStatus } from "./types";

type Job = { id: string; request_hash: string; status: "pending" | "succeeded" | "failed"; cost: number; billed_period_end: string | null; available?: boolean };

// All reservation/finalization/recovery operations serialize for one user, across servers.
async function locked<T>(userId: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await databasePool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(71604, hashtext($1))", [userId]);
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

async function failJobs(client: PoolClient, userId: string, id?: string) {
  const failed = await client.query<Job>(`UPDATE thumbnail_jobs SET status = 'failed', updated_at = now()
    WHERE user_id = $1 AND status = 'pending'
    AND ${id ? "id = $2" : "created_at < now() - interval '5 minutes'"}
    RETURNING id, cost, billed_period_end::text AS billed_period_end`, id ? [userId, id] : [userId]);
  for (const job of failed.rows) {
    if (job.cost) {
      // Do not carry an expired month's reservation into a freshly renewed balance.
      await client.query(`UPDATE billing_accounts SET credits_remaining = credits_remaining + $2, updated_at = now()
        WHERE user_id = $1 AND (CASE WHEN status = 'trialing' THEN trial_ends_at ELSE current_period_end END)
          IS NOT DISTINCT FROM $3::timestamptz`, [userId, job.cost, job.billed_period_end]);
    }
  }
}

export async function thumbnailStatus(userId: string): Promise<ThumbnailStatus> {
  return locked(userId, async client => {
    await failJobs(client, userId);
    const { day, resetsAt } = thumbnailDay();
    const balance = await client.query(`SELECT credits_remaining FROM billing_accounts WHERE user_id = $1 AND
      ((status = 'active' AND current_period_end > now()) OR (status = 'trialing' AND trial_ends_at > now()))`, [userId]);
    const free = await client.query(`SELECT 1 FROM thumbnail_jobs WHERE user_id = $1 AND quota_day = $2
      AND cost = 0 AND status IN ('pending','succeeded') LIMIT 1`, [userId, day]);
    const pending = await client.query(`SELECT id FROM thumbnail_jobs WHERE user_id = $1 AND status = 'pending'`, [userId]);
    const recent = await client.query(`SELECT id, topic, cost FROM thumbnail_jobs WHERE user_id = $1 AND status = 'succeeded'
      AND image IS NOT NULL ORDER BY created_at DESC LIMIT 6`, [userId]);
    return { credits: Number(balance.rows[0]?.credits_remaining ?? 0), freeAvailable: free.rowCount === 0,
      resetsAt, pending: pending.rows[0]?.id ?? null, recent: recent.rows, configured: thumbnailConfigured() };
  });
}

export async function reserveThumbnail(userId: string, input: ThumbnailInput) {
  // Recover independently so later validation rollback cannot undo stale-credit refunds.
  await locked(userId, client => failJobs(client, userId));
  return locked(userId, async client => {
    const hash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    const previous = await client.query<Job>("SELECT id, request_hash, status, cost, (image IS NOT NULL) AS available FROM thumbnail_jobs WHERE user_id = $1 AND id = $2", [userId, input.requestId]);
    const job = previous.rows[0];
    if (job) {
      if (job.request_hash !== hash) throw new ThumbnailError("This request ID belongs to a different thumbnail.", 409);
      if (job.status === "succeeded" && !job.available) throw new ThumbnailError("This older thumbnail is no longer stored. Create a new thumbnail instead.", 410);
      return { status: job.status, cost: job.cost, fresh: false };
    }
    const pending = await client.query("SELECT 1 FROM thumbnail_jobs WHERE user_id = $1 AND status = 'pending'", [userId]);
    if (pending.rowCount) throw new ThumbnailError("Your previous thumbnail is still generating.", 409);
    const rate = await client.query("SELECT count(*)::int AS count FROM thumbnail_jobs WHERE user_id = $1 AND created_at > now() - interval '10 minutes'", [userId]);
    if (rate.rows[0].count >= 6) throw new ThumbnailError("Please wait a few minutes before generating more thumbnails.", 429);
    const { day } = thumbnailDay();
    const used = await client.query("SELECT 1 FROM thumbnail_jobs WHERE user_id = $1 AND quota_day = $2 AND cost = 0 AND status = 'succeeded'", [userId, day]);
    const cost = used.rowCount ? THUMBNAIL_CREDITS : 0;
    if (cost > input.maxCost) throw new ThumbnailError("Today's free thumbnail has already been used. Refresh to confirm the 10-credit price.", 409);
    let periodEnd: string | null = null;
    if (cost) {
      const debit = await client.query(`UPDATE billing_accounts SET credits_remaining = credits_remaining - $2, updated_at = now()
        WHERE user_id = $1 AND credits_remaining >= $2 AND
        ((status = 'active' AND current_period_end > now()) OR (status = 'trialing' AND trial_ends_at > now()))
        RETURNING (CASE WHEN status = 'trialing' THEN trial_ends_at ELSE current_period_end END)::text AS period_end`, [userId, cost]);
      if (!debit.rowCount) throw new ThumbnailError("You need 10 Fox Credits. Upgrade your plan or use tomorrow's free thumbnail.", 402);
      periodEnd = debit.rows[0].period_end;
    }
    await client.query(`INSERT INTO thumbnail_jobs (id,user_id,request_hash,topic,quota_day,cost,billed_period_end,status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'pending')`, [input.requestId, userId, hash, input.topic, day, cost, periodEnd]);
    // Retain the latest six images; retain accounting metadata for retry safety and daily limits.
    await client.query(`UPDATE thumbnail_jobs SET image = NULL WHERE user_id = $1 AND image IS NOT NULL AND id NOT IN
      (SELECT id FROM thumbnail_jobs WHERE user_id = $1 AND image IS NOT NULL ORDER BY created_at DESC LIMIT 6)`, [userId]);
    return { status: "pending" as const, cost, fresh: true };
  });
}

export async function completeThumbnail(userId: string, id: string, image: { bytes: Buffer; mime: string }) {
  return locked(userId, async client => {
    const result = await client.query(`UPDATE thumbnail_jobs SET status = 'succeeded', image = $3, mime_type = $4, updated_at = now()
      WHERE user_id = $1 AND id = $2 AND status = 'pending' RETURNING id`, [userId, id, image.bytes, image.mime]);
    if (!result.rowCount) throw new ThumbnailError("This generation expired. Your allowance has been restored.", 409);
  });
}

export async function failThumbnail(userId: string, id: string) {
  await locked(userId, client => failJobs(client, userId, id));
}

export async function thumbnailImage(userId: string, id: string) {
  const result = await databasePool.query("SELECT image, mime_type FROM thumbnail_jobs WHERE user_id = $1 AND id = $2 AND status = 'succeeded' AND image IS NOT NULL", [userId, id]);
  return result.rows[0] as { image: Buffer; mime_type: string } | undefined;
}
