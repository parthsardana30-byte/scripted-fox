import { EditorWorkspace } from "@/components/dashboard/editor-workspace";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { getBillingAccess, hasBillingFeature } from "@/lib/billing/access";
import { getScriptVersionChangeLimit } from "@/lib/billing/plans";

export default async function ProjectEditorPage({ params }: { params: Promise<{ projectId: string }> }) {
  const [{ projectId }, user] = await Promise.all([params, requireAuthenticatedUser()]);
  const access = await getBillingAccess(user.id);
  const titles: Record<string, string> = {
    "camera-upgrade": "The camera upgrade that can wait",
    "thumbnail-system": "A thumbnail system for busy creators",
    "editing-tools": "Five free editing tools, tested",
  };
  const title = titles[projectId] ?? "Untitled script";
  return <EditorWorkspace
    projectTitle={title}
    projectKey={projectId}
    loadSessionDraft={projectId === "new-script"}
    canUseAdvancedExports={hasBillingFeature(access, "advanced_exports")}
    canUseScriptWriter={hasBillingFeature(access, "ai_script_writer")}
    versionChangeLimit={getScriptVersionChangeLimit(access.plan)}
    returnPath={`/dashboard/editor/${encodeURIComponent(projectId)}`}
  />;
}
