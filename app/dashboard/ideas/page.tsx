import { IdeasView } from "@/components/dashboard/ideas-view";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { getBillingAccess, hasBillingFeature } from "@/lib/billing/access";

export default async function IdeasPage() {
  const user = await requireAuthenticatedUser();
  const access = await getBillingAccess(user.id);
  return <IdeasView canUseScriptWriter={hasBillingFeature(access, "ai_script_writer")} />;
}
