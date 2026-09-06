import { ScriptHub } from "@/components/dashboard/script-hub";
import { cookies } from "next/headers";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { getBillingAccess, hasBillingFeature } from "@/lib/billing/access";
import { getScriptVersionChangeLimit } from "@/lib/billing/plans";
import { decodeLandingIntent, LANDING_INTENT_COOKIE } from "@/lib/landing-intent";
import { createClient } from "@/lib/db/client";

export default async function EditorPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const user = await requireAuthenticatedUser();
  const access = await getBillingAccess(user.id);
  const query = await searchParams;
  const cookieStore = await cookies();
  const database = await createClient();
  const { data: preferences } = await database.from("user_preferences")
    .select("content_languages,target_markets,default_script_preferences")
    .eq("user_id", user.id)
    .maybeSingle();
  const scriptPreferences = preferences?.default_script_preferences
    && typeof preferences.default_script_preferences === "object"
    && !Array.isArray(preferences.default_script_preferences)
    ? preferences.default_script_preferences
    : {};
  const topicPrompt = typeof query.topic === "string" ? query.topic.trim().slice(0, 500) : "";
  const initialPrompt = topicPrompt || decodeLandingIntent(cookieStore.get(LANDING_INTENT_COOKIE)?.value);
  const initialNiche = typeof scriptPreferences.channelNiche === "string" && scriptPreferences.channelNiche.trim()
    ? scriptPreferences.channelNiche.trim()
    : null;
  return <ScriptHub
    canUseAdvancedExports={hasBillingFeature(access, "advanced_exports")}
    canUseScriptWriter={hasBillingFeature(access, "ai_script_writer")}
    versionChangeLimit={getScriptVersionChangeLimit(access.plan)}
    initialNiche={initialNiche}
    initialPrompt={initialPrompt}
    initialSetupComplete={scriptPreferences.scriptHubSetupComplete === true}
    initialValues={{
      language: preferences?.content_languages?.[0] ?? "hinglish",
      market: preferences?.target_markets?.[0] ?? "IN",
      tone: typeof scriptPreferences.tone === "string" ? scriptPreferences.tone : "clear",
      videoLength: typeof scriptPreferences.videoLength === "string" ? scriptPreferences.videoLength : "7-10",
      detailLevel: typeof scriptPreferences.detailLevel === "string" ? scriptPreferences.detailLevel : "balanced",
      openingStyle: typeof scriptPreferences.openingStyle === "string" ? scriptPreferences.openingStyle : "hook",
      format: typeof scriptPreferences.format === "string" ? scriptPreferences.format : "youtube",
    }}
  />;
}
