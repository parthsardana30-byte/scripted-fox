"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/db/client";
import { creatorNiches, nicheById } from "@/lib/youtube/niches";
import type { Json } from "@/types/database";

export type NicheConfirmationState = {
  status: "idle" | "error";
  message?: string;
};

const nicheSchema = z.enum(creatorNiches.map((niche) => niche.id) as [string, ...string[]]);
const returnPathSchema = z.enum(["/dashboard", "/dashboard/settings"]);

function objectValue(value: Json | undefined) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export async function confirmYouTubeNiche(
  _state: NicheConfirmationState,
  formData: FormData,
): Promise<NicheConfirmationState> {
  const parsed = nicheSchema.safeParse(formData.get("nicheId"));
  if (!parsed.success) {
    return { status: "error", message: "Choose one of the available channel niches." };
  }
  const selectedNiche = nicheById(parsed.data);
  if (!selectedNiche) return { status: "error", message: "Choose one of the available channel niches." };
  const parsedReturnPath = returnPathSchema.safeParse(formData.get("returnPath"));
  const returnPath = parsedReturnPath.success ? parsedReturnPath.data : "/dashboard";

  const user = await requireAuthenticatedUser();
  const database = await createClient();
  const [{ data: connection }, { data: preferences }] = await Promise.all([
    database
      .from("youtube_connections")
      .select("channel_id,status")
      .eq("user_id", user.id)
      .maybeSingle(),
    database
      .from("user_preferences")
      .select("default_script_preferences")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!connection?.channel_id || !["connected", "syncing", "stale"].includes(connection.status)) {
    return { status: "error", message: "Reconnect YouTube before confirming your niche." };
  }

  const { error } = await database
    .from("user_preferences")
    .update({
      default_script_preferences: {
        ...objectValue(preferences?.default_script_preferences),
        channelNiche: selectedNiche.label,
        channelNicheId: selectedNiche.id,
        channelNicheChannelId: connection.channel_id,
        channelNicheConfirmedAt: new Date().toISOString(),
        channelSetupStatus: "processing",
        channelSetupChannelId: connection.channel_id,
        channelSetupStartedAt: new Date().toISOString(),
        channelSetupCompletedAt: null,
        channelSetupError: null,
      },
    })
    .eq("user_id", user.id);

  if (error) return { status: "error", message: "Your niche could not be saved. Try again." };

  revalidatePath("/dashboard", "layout");
  redirect(returnPath);
}
