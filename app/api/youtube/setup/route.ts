import { z } from "zod";

import { AuthenticationRequiredError, requireAuthenticatedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/db/client";
import { isTrustedSameOriginRequest } from "@/lib/security/origin";
import type { Json } from "@/types/database";
import { getChannelAnalytics } from "@/lib/youtube/analytics";

export const runtime = "nodejs";

const actionSchema = z.object({
  action: z.enum(["sync", "complete", "fail", "retry"]),
});

function objectValue(value: Json | undefined) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

async function loadSetup(userId: string) {
  const database = await createClient();
  const [{ data: connection }, { data: preferences }] = await Promise.all([
    database.from("youtube_connections").select("channel_id,channel_title,status").eq("user_id", userId).maybeSingle(),
    database.from("user_preferences").select("default_script_preferences").eq("user_id", userId).maybeSingle(),
  ]);
  const defaults = objectValue(preferences?.default_script_preferences);
  const sameChannel = Boolean(connection?.channel_id && defaults.channelSetupChannelId === connection.channel_id);
  const rawStatus = sameChannel && typeof defaults.channelSetupStatus === "string"
    ? defaults.channelSetupStatus
    : null;
  const status = !connection?.channel_id
    ? "disconnected"
    : rawStatus === "ready" || rawStatus === "error" || rawStatus === "processing" || rawStatus === "awaiting_niche"
      ? rawStatus
      : "ready";
  return { database, connection, defaults, status };
}

async function updateSetup(userId: string, defaults: Record<string, Json | undefined>, values: Record<string, Json | undefined>) {
  const database = await createClient();
  const { error } = await database.from("user_preferences").update({
    default_script_preferences: { ...defaults, ...values } as Json,
  }).eq("user_id", userId);
  if (error) throw new Error("Channel setup status could not be saved.");
}

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const setup = await loadSetup(user.id);
    return Response.json({
      status: setup.status,
      channelName: setup.connection?.channel_title ?? null,
      error: setup.status === "error" ? "We couldn't finish personalizing your channel." : null,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return Response.json({ error: "Sign in to check channel setup." }, { status: 401 });
    return Response.json({ error: "Channel setup status is unavailable." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isTrustedSameOriginRequest(request)) return Response.json({ error: "This request is not allowed." }, { status: 403 });
  try {
    const user = await requireAuthenticatedUser();
    const parsed = actionSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "The setup request is invalid." }, { status: 400 });
    const setup = await loadSetup(user.id);
    if (!setup.connection?.channel_id) return Response.json({ error: "Connect YouTube before starting setup." }, { status: 409 });

    if (parsed.data.action === "sync") {
      if (setup.status === "ready") return Response.json({ status: "ready" });
      const analytics = await getChannelAnalytics(user.id, { forceRefresh: true });
      if (analytics.kind !== "ready") throw new Error("YouTube channel data could not be synced.");
      return Response.json({ status: "processing" });
    }

    if (parsed.data.action === "complete") {
      const setupStartedAt = typeof setup.defaults.channelSetupStartedAt === "string"
        ? setup.defaults.channelSetupStartedAt
        : new Date(Date.now() - 24 * 60 * 60_000).toISOString();
      const { count } = await setup.database.from("usage_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("operation", "ai_idea_recommendations")
        .gte("created_at", setupStartedAt);
      if (!count) return Response.json({ error: "Your first Daily Topics are not ready yet." }, { status: 409 });
      await updateSetup(user.id, setup.defaults, {
        channelSetupStatus: "ready",
        channelSetupChannelId: setup.connection.channel_id,
        channelSetupCompletedAt: new Date().toISOString(),
        channelSetupError: null,
      });
      return Response.json({ status: "ready" });
    }

    if (parsed.data.action === "retry") {
      await updateSetup(user.id, setup.defaults, {
        channelSetupStatus: "processing",
        channelSetupStartedAt: new Date().toISOString(),
        channelSetupCompletedAt: null,
        channelSetupError: null,
      });
      return Response.json({ status: "processing" });
    }

    await updateSetup(user.id, setup.defaults, {
      channelSetupStatus: "error",
      channelSetupError: "initial_setup_failed",
    });
    return Response.json({ status: "error" });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return Response.json({ error: "Sign in to set up your channel." }, { status: 401 });
    return Response.json({ error: error instanceof Error ? error.message : "Channel setup could not be completed." }, { status: 500 });
  }
}
