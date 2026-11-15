import "server-only";

import { databasePool } from "@/lib/db/pool";
import { scriptDocumentSchema, scriptVersionSchema, type ScriptDocument, type StoredScriptVersion } from "@/lib/projects/types";

const projectDateFormatter = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });

export type ProjectListItem = {
  id: string;
  title: string;
  status: "Draft" | "Ready to record" | "Published";
  words: number;
  duration: string;
  updatedAt: string;
};

function displayStatus(status: string): ProjectListItem["status"] {
  if (status === "ready_to_record") return "Ready to record";
  if (status === "complete") return "Published";
  return "Draft";
}

export async function listProjects(userId: string): Promise<ProjectListItem[]> {
  const result = await databasePool.query<{
    id: string; title: string; status: string; updated_at: Date; word_count: number | null;
  }>(
    `SELECT p.id, p.title, p.status, p.updated_at, s.word_count
     FROM projects p
     LEFT JOIN scripts s ON s.project_id = p.id AND s.user_id = p.user_id
     WHERE p.user_id = $1 AND p.archived_at IS NULL
     ORDER BY p.updated_at DESC`,
    [userId],
  );
  return result.rows.map((row) => {
    const words = row.word_count ?? 0;
    return {
      id: row.id,
      title: row.title,
      status: displayStatus(row.status),
      words,
      duration: `${words === 0 ? 0 : Math.max(1, Math.ceil(words / 150))} min`,
      updatedAt: projectDateFormatter.format(row.updated_at),
    };
  });
}

export async function loadProject(userId: string, projectId: string): Promise<{
  projectId: string;
  document: ScriptDocument;
  versions: StoredScriptVersion[];
} | null> {
  const project = await databasePool.query<{ id: string; title: string; document: unknown; script_id: string | null }>(
    `SELECT p.id, p.title, s.document, s.id AS script_id
     FROM projects p
     LEFT JOIN scripts s ON s.project_id = p.id AND s.user_id = p.user_id
     WHERE p.id = $1 AND p.user_id = $2 AND p.archived_at IS NULL
     LIMIT 1`,
    [projectId, userId],
  );
  const row = project.rows[0];
  if (!row) return null;
  const parsedDocument = scriptDocumentSchema.safeParse(row.document);
  const document: ScriptDocument = parsedDocument.success
    ? parsedDocument.data
    : { title: row.title, author: "", draft: { title: row.title, sections: [{ label: "Script", body: "" }] } };
  if (!row.script_id) return { projectId: row.id, document, versions: [] };
  const versionRows = await databasePool.query<{ version: number; label: string; origin: string; created_at: Date; snapshot: unknown }>(
    `SELECT version, label, origin, created_at, snapshot
     FROM script_versions
     WHERE script_id = $1 AND user_id = $2
     ORDER BY version ASC`,
    [row.script_id, userId],
  );
  const versions = versionRows.rows.flatMap((version) => {
    const parsed = scriptVersionSchema.safeParse({
      number: version.version,
      label: version.label,
      origin: version.origin,
      createdAt: version.created_at.toISOString(),
      snapshot: version.snapshot,
    });
    return parsed.success ? [parsed.data] : [];
  });
  return { projectId: row.id, document, versions };
}
