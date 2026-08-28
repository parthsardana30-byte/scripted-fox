import { EditorWorkspace } from "@/components/dashboard/editor-workspace";
import { cookies } from "next/headers";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { getBillingAccess, hasBillingFeature } from "@/lib/billing/access";
import { getScriptVersionChangeLimit } from "@/lib/billing/plans";
import { decodeLandingIntent, LANDING_INTENT_COOKIE } from "@/lib/landing-intent";

export default async function EditorPage() {
  const user = await requireAuthenticatedUser();
  const access = await getBillingAccess(user.id);
  const cookieStore = await cookies();
  const initialPrompt = decodeLandingIntent(cookieStore.get(LANDING_INTENT_COOKIE)?.value);
  return <EditorWorkspace
    canUseAdvancedExports={hasBillingFeature(access, "advanced_exports")}
    canUseScriptWriter={hasBillingFeature(access, "ai_script_writer")}
    versionChangeLimit={getScriptVersionChangeLimit(access.plan)}
    returnPath="/dashboard/editor"
    initialPrompt={initialPrompt}
  />;
}
