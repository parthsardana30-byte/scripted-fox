"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/db/client";

const creatorProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  channelNiche: z.string().trim().max(80),
  channelGoal: z.enum(["growth", "authority", "leads", "community"]),
});

export type DeleteAccountState = {
  status: "idle" | "error" | "deleted" | "verification-sent";
  message: string;
};

export type CreatorProfileState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE"),
  password: z.string().max(72).optional(),
  passwordRequired: z.enum(["true", "false"]),
}).superRefine((value, context) => {
  if (value.passwordRequired === "true" && !value.password) {
    context.addIssue({ code: "custom", path: ["password"], message: "Enter your current password." });
  }
});

export async function updateCreatorProfile(
  _previousState: CreatorProfileState,
  formData: FormData,
): Promise<CreatorProfileState> {
  const parsed = creatorProfileSchema.safeParse({
    displayName: formData.get("displayName"),
    channelNiche: formData.get("channelNiche"),
    channelGoal: formData.get("channelGoal"),
  });
  if (!parsed.success) return { status: "error", message: "Check the profile details and try again." };

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
  const [{ error: profileError }, authResult, { error: preferencesError }] = await Promise.all([
    supabase.from("profiles").update({ display_name: parsed.data.displayName }).eq("id", user.id),
    auth.api.updateUser({ body: { name: parsed.data.displayName }, headers: await headers() })
      .then(() => ({ error: null })).catch(() => ({ error: new Error("Profile update failed") })),
    supabase.from("user_preferences").update({
      default_script_preferences: {
        ...currentScriptPreferences,
        channelNiche: parsed.data.channelNiche,
        channelGoal: parsed.data.channelGoal,
      },
    }).eq("user_id", user.id),
  ]);

  if (profileError || authResult.error || preferencesError) {
    return { status: "error", message: "Profile changes could not be saved." };
  }
  revalidatePath("/dashboard/settings");
  return { status: "success", message: "Profile saved." };
}

export async function deleteAccount(
  _previousState: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const user = await requireAuthenticatedUser();
  const providers = Array.isArray(user.app_metadata.providers) ? user.app_metadata.providers : [];
  const passwordRequired = providers.includes("credential");
  const passwordValue = formData.get("password");
  const parsed = deleteAccountSchema.safeParse({
    confirmation: formData.get("confirmation"),
    password: typeof passwordValue === "string" ? passwordValue : undefined,
    passwordRequired: passwordRequired ? "true" : "false",
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the confirmation and try again." };
  }

  try {
    const result = await auth.api.deleteUser({
      headers: await headers(),
      body: {
        callbackURL: "/?account=deleted",
        ...(parsed.data.password ? { password: parsed.data.password } : {}),
      },
    });
    return result.message === "Verification email sent"
      ? { status: "verification-sent", message: "Check your email to finish deleting your account. The link expires in 24 hours." }
      : { status: "deleted", message: "Your account has been permanently deleted." };
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("invalid password")) {
      return { status: "error", message: "That password is not correct." };
    }
    if (message.includes("session") || message.includes("fresh")) {
      return { status: "error", message: "For security, sign out and sign in again before deleting your account." };
    }
    return { status: "error", message: "Your account could not be deleted. Try again or contact support." };
  }
}
