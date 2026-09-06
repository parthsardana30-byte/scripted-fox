"use server";

import { z } from "zod";

import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/db/client";

export type ScriptSetupState = { status: "idle" | "success" | "error"; message?: string };

const scriptSetupSchema = z.object({
  language: z.enum(["en", "hi", "hinglish"]),
  market: z.enum(["IN", "GLOBAL"]),
  tone: z.enum(["clear", "direct", "educational", "energetic"]),
  videoLength: z.enum(["under-5", "7-10", "10-15", "shorts"]),
  detailLevel: z.enum(["lean", "balanced", "detailed"]),
  openingStyle: z.enum(["value-first", "hook", "story"]),
  format: z.enum(["youtube", "shorts", "reel"]),
});

export async function saveScriptHubSetup(
  _state: ScriptSetupState,
  formData: FormData,
): Promise<ScriptSetupState> {
  const parsed = scriptSetupSchema.safeParse({
    language: formData.get("language"),
    market: formData.get("market"),
    tone: formData.get("tone"),
    videoLength: formData.get("videoLength"),
    detailLevel: formData.get("detailLevel"),
    openingStyle: formData.get("openingStyle"),
    format: formData.get("format"),
  });
  if (!parsed.success) return { status: "error", message: "Choose every script preference to continue." };

  const user = await requireAuthenticatedUser();
  const database = await createClient();
  const { data: current } = await database
    .from("user_preferences")
    .select("default_script_preferences")
    .eq("user_id", user.id)
    .maybeSingle();
  const currentPreferences = current?.default_script_preferences
    && typeof current.default_script_preferences === "object"
    && !Array.isArray(current.default_script_preferences)
    ? current.default_script_preferences
    : {};

  const { error } = await database.from("user_preferences").update({
    content_languages: [parsed.data.language],
    target_markets: [parsed.data.market],
    default_script_preferences: {
      ...currentPreferences,
      tone: parsed.data.tone,
      videoLength: parsed.data.videoLength,
      detailLevel: parsed.data.detailLevel,
      openingStyle: parsed.data.openingStyle,
      format: parsed.data.format,
      scriptHubSetupComplete: true,
    },
  }).eq("user_id", user.id);

  if (error) return { status: "error", message: "Your setup could not be saved. Try again." };
  return { status: "success", message: "Script setup saved." };
}
