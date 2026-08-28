"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const creatorProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  channelNiche: z.string().trim().max(80),
  channelGoal: z.enum(["growth", "authority", "leads", "community"]),
});

export async function updateCreatorProfile(formData: FormData) {
  const parsed = creatorProfileSchema.safeParse({
    displayName: formData.get("displayName"),
    channelNiche: formData.get("channelNiche"),
    channelGoal: formData.get("channelGoal"),
  });
  if (!parsed.success) redirect("/dashboard/account?profile=invalid");

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
  const [{ error: profileError }, { error: authError }, { error: preferencesError }] = await Promise.all([
    supabase.from("profiles").update({ display_name: parsed.data.displayName }).eq("id", user.id),
    supabase.auth.updateUser({ data: { full_name: parsed.data.displayName } }),
    supabase.from("user_preferences").update({
      default_script_preferences: {
        ...currentScriptPreferences,
        channelNiche: parsed.data.channelNiche,
        channelGoal: parsed.data.channelGoal,
      },
    }).eq("user_id", user.id),
  ]);

  redirect(`/dashboard/account?profile=${profileError || authError || preferencesError ? "error" : "saved"}`);
}
