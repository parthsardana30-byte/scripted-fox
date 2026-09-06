import { IdeasView } from "@/components/dashboard/ideas-view";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { getBillingAccess, hasBillingFeature } from "@/lib/billing/access";
import { createClient } from "@/lib/db/client";
import type { Json } from "@/types/database";

function objectValue(value: Json | undefined) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export default async function IdeasPage() {
  const user = await requireAuthenticatedUser();
  const supabase = await createClient();
  const [access, { data: preferences }] = await Promise.all([
    getBillingAccess(user.id),
    supabase.from("user_preferences").select("default_script_preferences").eq("user_id", user.id).maybeSingle(),
  ]);
  const defaults = objectValue(preferences?.default_script_preferences);
  const niche = typeof defaults.channelNiche === "string" && defaults.channelNiche.trim() ? defaults.channelNiche.trim() : null;
  return <IdeasView canUseScriptWriter={hasBillingFeature(access, "ai_script_writer")} initialNiche={niche} />;
}
