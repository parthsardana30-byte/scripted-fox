import { randomUUID } from "node:crypto";

import { AuthenticationRequiredError, requireAuthenticatedUser } from "@/lib/auth/session";
import { getBillingAccess } from "@/lib/billing/access";
import { getScriptVersionChangeLimit } from "@/lib/billing/plans";
import { databasePool } from "@/lib/db/pool";
import { projectSaveSchema } from "@/lib/projects/types";
import { replaceScriptVersions } from "@/lib/projects/save-versions";
import { readJsonBody, RequestBodyError } from "@/lib/security/request-body";
import { isTrustedSameOriginRequest } from "@/lib/security/origin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isTrustedSameOriginRequest(request)) return Response.json({ error: "This request is not allowed." }, { status: 403 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 250_000) return Response.json({ error: "This script is too large to save." }, { status: 413 });

  try {
    const user = await requireAuthenticatedUser();
    const parsed = projectSaveSchema.safeParse(await readJsonBody(request, 250_000));
    if (!parsed.success) return Response.json({ error: "The script could not be saved because its data is invalid." }, { status: 400 });
    const { document, versions } = parsed.data;
    const access = await getBillingAccess(user.id);
    let maximumVersions = getScriptVersionChangeLimit(access.plan) + 1;
    if (parsed.data.projectId) {
      const existing = await databasePool.query<{ count: number }>(
        `SELECT COUNT(v.id)::int AS count
         FROM projects p
         LEFT JOIN scripts s ON s.project_id = p.id AND s.user_id = p.user_id
         LEFT JOIN script_versions v ON v.script_id = s.id AND v.user_id = p.user_id
         WHERE p.id = $1 AND p.user_id = $2 AND p.archived_at IS NULL`,
        [parsed.data.projectId, user.id],
      );
      maximumVersions = Math.max(maximumVersions, existing.rows[0]?.count ?? 0);
    }
    if (versions.length > maximumVersions) {
      return Response.json({ error: "This script has reached the version limit for your plan." }, { status: 402 });
    }
    const projectId = parsed.data.projectId ?? randomUUID();
    const text = document.draft.sections.map((section) => section.body).join(" ").trim();
    const wordCount = text ? text.split(/\s+/).length : 0;
    const activeVersion = versions.at(-1)?.number ?? 1;
    const client = await databasePool.connect();
    try {
      await client.query("BEGIN");
      if (parsed.data.projectId) {
        const updated = await client.query(
          `UPDATE projects SET title = $3, status = 'writing', updated_at = now()
           WHERE id = $1 AND user_id = $2 AND archived_at IS NULL RETURNING id`,
          [projectId, user.id, document.title || "Untitled script"],
        );
        if (updated.rowCount === 0) {
          await client.query("ROLLBACK");
          return Response.json({ error: "This project was not found." }, { status: 404 });
        }
      } else {
        await client.query(
          `INSERT INTO projects (id, user_id, title, status, updated_at)
           VALUES ($1, $2, $3, 'writing', now())`,
          [projectId, user.id, document.title || "Untitled script"],
        );
      }
      const script = await client.query<{ id: string }>(
        `INSERT INTO scripts (user_id, project_id, active_version, word_count, estimated_duration_seconds, document, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, now())
         ON CONFLICT (project_id) DO UPDATE SET active_version = EXCLUDED.active_version,
           word_count = EXCLUDED.word_count, estimated_duration_seconds = EXCLUDED.estimated_duration_seconds,
           document = EXCLUDED.document, updated_at = now()
         RETURNING id`,
        [user.id, projectId, activeVersion, wordCount, wordCount === 0 ? 0 : Math.ceil(wordCount / 2.5), JSON.stringify(document)],
      );
      const scriptId = script.rows[0].id;
      await replaceScriptVersions(client, user.id, scriptId, versions);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return Response.json({ projectId, savedAt: new Date().toISOString() });
  } catch (error) {
    if (error instanceof RequestBodyError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof AuthenticationRequiredError) return Response.json({ error: "Sign in to save scripts." }, { status: 401 });
    console.error("[Projects] Save failed", error instanceof Error ? { name: error.name, message: error.message } : { name: "UnknownError" });
    return Response.json({ error: "The script could not be saved. Your draft is still open—try again." }, { status: 500 });
  }
}
