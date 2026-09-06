import { SettingsView } from "@/components/dashboard/settings-view";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/db/client";

export default async function SettingsPage() {
  const user = await requireAuthenticatedUser();
  const supabase = await createClient();
  const { data: preferences } = await supabase
    .from("user_preferences")
    .select("content_languages,target_markets,default_script_preferences,export_defaults")
    .eq("user_id", user.id)
    .maybeSingle();
  const scriptPreferences = preferences?.default_script_preferences
    && typeof preferences.default_script_preferences === "object"
    && !Array.isArray(preferences.default_script_preferences)
    ? preferences.default_script_preferences
    : {};
  const exportDefaults = preferences?.export_defaults
    && typeof preferences.export_defaults === "object"
    && !Array.isArray(preferences.export_defaults)
    ? preferences.export_defaults
    : {};

  return <SettingsView initialValues={{
    language: preferences?.content_languages?.[0] ?? "en",
    secondaryLanguage: preferences?.content_languages?.[1] ?? "none",
    market: preferences?.target_markets?.[0] ?? "IN",
    tone: typeof scriptPreferences.tone === "string" ? scriptPreferences.tone : "clear",
    videoLength: typeof scriptPreferences.videoLength === "string" ? scriptPreferences.videoLength : "7-10",
    detailLevel: typeof scriptPreferences.detailLevel === "string" ? scriptPreferences.detailLevel : "balanced",
    openingStyle: typeof scriptPreferences.openingStyle === "string" ? scriptPreferences.openingStyle : "value-first",
    openAssistant: typeof scriptPreferences.openAssistant === "boolean" ? scriptPreferences.openAssistant : true,
    exportFormat: typeof exportDefaults.format === "string" ? exportDefaults.format : "markdown",
    includeTitle: typeof exportDefaults.includeTitle === "boolean" ? exportDefaults.includeTitle : true,
  }} />;
}
