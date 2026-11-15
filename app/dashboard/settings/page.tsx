import { SettingsView } from "@/components/dashboard/settings-view";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/db/client";
import { getBillingAccess } from "@/lib/billing/access";
import { getPlanDisplayName } from "@/lib/billing/plans";

export default async function SettingsPage() {
  const user = await requireAuthenticatedUser();
  const supabase = await createClient();
  const [{ data: preferences }, { data: connection }, { data: profile }, access] = await Promise.all([
    supabase
      .from("user_preferences")
      .select("content_languages,target_markets,default_script_preferences")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("youtube_connections")
      .select("channel_id,channel_title,status,last_synced_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    getBillingAccess(user.id),
  ]);
  const scriptPreferences = preferences?.default_script_preferences
    && typeof preferences.default_script_preferences === "object"
    && !Array.isArray(preferences.default_script_preferences)
    ? preferences.default_script_preferences
    : {};
  const channelNiche = typeof scriptPreferences.channelNiche === "string" && scriptPreferences.channelNiche.trim()
    ? scriptPreferences.channelNiche.trim()
    : null;
  const connected = ["connected", "syncing", "stale"].includes(connection?.status ?? "");
  const providers = Array.isArray(user.app_metadata.providers) ? user.app_metadata.providers : [];
  const hasPassword = providers.includes("credential");
  const hasGoogle = providers.includes("google");
  const displayName = profile?.display_name ?? (typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : "Creator");
  const channelGoal = ["growth", "authority", "leads", "community"].includes(String(scriptPreferences.channelGoal))
    ? scriptPreferences.channelGoal as "growth" | "authority" | "leads" | "community"
    : "growth";

  return <SettingsView account={{
    displayName,
    email: user.email ?? "Not available",
    memberSince: new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(user.created_at)),
    signInMethod: hasGoogle && hasPassword ? "Google and email" : hasGoogle ? "Google" : "Email and password",
    hasPassword,
    hasGoogle,
    channelNiche: channelNiche ?? "",
    channelGoal,
    connection: {
      active: connected,
      title: connected ? connection?.channel_title ?? "YouTube connected" : "No channel connected",
      status: connected ? `Status: ${connection?.status}` : "Add channel context to recommendations and analytics.",
    },
    plan: {
      name: getPlanDisplayName(access.displayPlan),
      description: access.status === "trialing"
        ? `Trial active · ${access.creditsRemaining.toLocaleString("en-IN")} of ${access.creditsAllowance.toLocaleString("en-IN")} credits left`
        : access.plan === "free"
          ? "No subscription is attached."
          : `${access.creditsRemaining.toLocaleString("en-IN")} of ${access.creditsAllowance.toLocaleString("en-IN")} credits left`,
    },
  }} channel={connected && channelNiche ? {
    name: connection?.channel_title ?? "YouTube channel",
    niche: channelNiche,
  } : null} initialValues={{
    language: preferences?.content_languages?.[0] ?? "en",
    secondaryLanguage: preferences?.content_languages?.[1] ?? "none",
    market: preferences?.target_markets?.[0] ?? "IN",
    tone: typeof scriptPreferences.tone === "string" ? scriptPreferences.tone : "clear",
    videoLength: typeof scriptPreferences.videoLength === "string" ? scriptPreferences.videoLength : "7-10",
    openingStyle: typeof scriptPreferences.openingStyle === "string" ? scriptPreferences.openingStyle : "value-first",
  }} />;
}
