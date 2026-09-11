"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/db/client";
import { disconnectYouTube } from "@/lib/youtube/repository";

export type SettingsActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export type ChannelDisconnectState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function disconnectYouTubeFromSettings(
  _state: ChannelDisconnectState,
  _formData: FormData,
): Promise<ChannelDisconnectState> {
  void _state;
  void _formData;
  try {
    const user = await requireAuthenticatedUser();
    await disconnectYouTube(user.id);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    return { status: "success", message: "YouTube channel disconnected." };
  } catch {
    return { status: "error", message: "The channel could not be disconnected." };
  }
}

const settingsSchema = z.object({
  language: z.enum(["en", "hi", "hinglish"]),
  secondaryLanguage: z.enum(["none", "en", "hi", "hinglish"]),
  market: z.enum(["IN", "GLOBAL"]),
  tone: z.enum(["clear", "direct", "educational"]),
  videoLength: z.enum(["under-5", "7-10", "10-15"]),
  openingStyle: z.enum(["value-first", "hook", "story"]),
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
    openingStyle: formData.get("openingStyle"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Choose a value for each preference, then save again." };
  }

  const user = await requireAuthenticatedUser();
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("user_preferences")
    .select("default_script_preferences")
    .eq("user_id", user.id)
    .maybeSingle();
  const currentScriptPreferences = current?.default_script_preferences
    && typeof current.default_script_preferences === "object"
    && !Array.isArray(current.default_script_preferences)
    ? current.default_script_preferences
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
        openingStyle: parsed.data.openingStyle,
      },
    })
    .eq("user_id", user.id);

  if (error) return { status: "error", message: "Preferences could not be saved. Try again." };
  revalidatePath("/dashboard");
  return { status: "success", message: "Preferences saved." };
}
