import { HomeDashboard, type DashboardSetupStatus } from "@/components/dashboard/home-dashboard";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import { getBillingAccess, hasBillingFeature } from "@/lib/billing/access";

function jsonObject(value: Json | undefined) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export default async function DashboardPage() {
  const user = await requireAuthenticatedUser();
  const metadata = user.user_metadata as Record<string, unknown>;
  const metadataName = metadata.full_name ?? metadata.name ?? metadata.display_name;
  const userName = typeof metadataName === "string" && metadataName.trim()
    ? metadataName.trim()
    : user.email?.split("@")[0] ?? "Creator";
  const supabase = await createClient();
  const [{ data: preferences }, { data: connection }, access] = await Promise.all([
    supabase
      .from("user_preferences")
      .select("default_script_preferences,export_defaults")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("youtube_connections")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle(),
    getBillingAccess(user.id),
  ]);
  const scriptPreferences = jsonObject(preferences?.default_script_preferences);
  const exportDefaults = jsonObject(preferences?.export_defaults);
  const setup: DashboardSetupStatus = {
    accountCreated: true,
    channelConnected: ["connected", "syncing", "stale"].includes(connection?.status ?? ""),
    preferencesSet: ["tone", "videoLength", "detailLevel", "openingStyle"].every((key) => typeof scriptPreferences[key] === "string")
      && typeof exportDefaults.format === "string",
  };

  return <HomeDashboard setup={setup} canUseScriptWriter={hasBillingFeature(access, "ai_script_writer")} userName={userName} />;
}
