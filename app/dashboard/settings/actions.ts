"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type SettingsActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const settingsSchema = z.object({
  language: z.enum(["en", "hi", "hinglish"]),
  secondaryLanguage: z.enum(["none", "en", "hi", "hinglish"]),
  market: z.enum(["IN", "GLOBAL"]),
  tone: z.enum(["clear", "direct", "educational"]),
  videoLength: z.enum(["under-5", "7-10", "10-15"]),
  detailLevel: z.enum(["lean", "balanced", "detailed"]),
  openingStyle: z.enum(["value-first", "hook", "story"]),
  exportFormat: z.enum(["markdown", "txt", "pdf", "docx"]),
  includeTitle: z.preprocess((value) => value === "on", z.boolean()),
  openAssistant: z.preprocess((value) => value === "on", z.boolean()),
}).refine(
  (values) => values.secondaryLanguage === "none" || values.secondaryLanguage !== values.language,
  { message: "Choose a different secondary language.", path: ["secondaryLanguage"] },
);

export async function saveSettings(
  _state: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const parsed = settingsSchema.safeParse({
    language: formData.get("language"),
    secondaryLanguage: formData.get("secondaryLanguage"),
    market: formData.get("market"),
    tone: formData.get("tone"),
    videoLength: formData.get("videoLength"),
    detailLevel: formData.get("detailLevel"),
    openingStyle: formData.get("openingStyle"),
    exportFormat: formData.get("exportFormat"),
    includeTitle: formData.get("includeTitle"),
    openAssistant: formData.get("openAssistant"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Choose a value for each preference, then save again." };
  }

  const user = await requireAuthenticatedUser();
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("user_preferences")
    .select("default_script_preferences,export_defaults")
    .eq("user_id", user.id)
    .maybeSingle();
  const currentScriptPreferences = current?.default_script_preferences
    && typeof current.default_script_preferences === "object"
    && !Array.isArray(current.default_script_preferences)
    ? current.default_script_preferences
    : {};
  const currentExportDefaults = current?.export_defaults
    && typeof current.export_defaults === "object"
    && !Array.isArray(current.export_defaults)
    ? current.export_defaults
    : {};
  const contentLanguages = [
    parsed.data.language,
    ...(parsed.data.secondaryLanguage === "none" ? [] : [parsed.data.secondaryLanguage]),
  ];

  const { error } = await supabase
    .from("user_preferences")
    .update({
      content_languages: contentLanguages,
      target_markets: [parsed.data.market],
      default_script_preferences: {
        ...currentScriptPreferences,
        tone: parsed.data.tone,
        videoLength: parsed.data.videoLength,
        detailLevel: parsed.data.detailLevel,
        openingStyle: parsed.data.openingStyle,
        openAssistant: parsed.data.openAssistant,
      },
      export_defaults: {
        ...currentExportDefaults,
        format: parsed.data.exportFormat,
        includeTitle: parsed.data.includeTitle,
      },
    })
    .eq("user_id", user.id);

  if (error) return { status: "error", message: "Preferences could not be saved. Try again." };
  revalidatePath("/dashboard");
  return { status: "success", message: "Preferences saved." };
}
