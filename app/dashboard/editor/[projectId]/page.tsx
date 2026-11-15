import { EditorWorkspace } from "@/components/dashboard/editor-workspace";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { getBillingAccess, hasBillingFeature } from "@/lib/billing/access";
import { getScriptVersionChangeLimit } from "@/lib/billing/plans";
import { loadProject } from "@/lib/projects/repository";
import { notFound } from "next/navigation";

export default async function ProjectEditorPage({ params }: { params: Promise<{ projectId: string }> }) {
  const [{ projectId }, user] = await Promise.all([params, requireAuthenticatedUser()]);
  const [access, project] = await Promise.all([getBillingAccess(user.id), loadProject(user.id, projectId)]);
  if (!project) notFound();
  return <EditorWorkspace
    projectTitle={project.document.title}
    projectKey={projectId}
    persistedProjectId={project.projectId}
    initialDocument={project.document}
    initialVersions={project.versions}
    persistProjects
    canUseAdvancedExports={hasBillingFeature(access, "advanced_exports")}
    canUseScriptWriter={hasBillingFeature(access, "ai_script_writer")}
    versionChangeLimit={getScriptVersionChangeLimit(access.plan)}
    returnPath={`/dashboard/editor/${encodeURIComponent(projectId)}`}
  />;
}
