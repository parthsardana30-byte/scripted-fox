import "server-only";

import { createAdminClient } from "@/lib/db/client";
import { maskedAccountHint } from "@/lib/auth/account-hint";
import { encryptRefreshToken } from "@/lib/youtube/crypto";
import { requireYouTubeEnvironment, YOUTUBE_SCOPES } from "@/lib/youtube/config";
import type { YouTubeChannel, YouTubeTokenResponse } from "@/lib/youtube/google";
import type { Json } from "@/types/database";

export class YouTubeChannelAlreadyConnectedError extends Error {
  constructor(public readonly accountHint: string) {
    super("This YouTube channel is already connected to another Scripted Fox account.");
    this.name = "YouTubeChannelAlreadyConnectedError";
  }
}

async function findChannelOwnerHint(userId: string, channelId: string) {
  const admin = createAdminClient();
  const { data: connection, error: connectionError } = await admin
    .from("youtube_connections")
    .select("user_id")
    .eq("channel_id", channelId)
    .maybeSingle();

  if (connectionError || !connection || connection.user_id === userId) return null;

  const { data: owner } = await admin
    .from("user")
    .select("email")
    .eq("id", connection.user_id)
    .maybeSingle();

  return maskedAccountHint({ email: owner?.email });
}

export async function saveYouTubeConnection(
  userId: string,
  channel: YouTubeChannel,
  tokens: YouTubeTokenResponse,
) {
  if (!tokens.refresh_token) throw new Error("Google did not return a YouTube refresh token.");

  const existingOwnerHint = await findChannelOwnerHint(userId, channel.id);
  if (existingOwnerHint) throw new YouTubeChannelAlreadyConnectedError(existingOwnerHint);

  const admin = createAdminClient();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + tokens.expires_in * 1000);
  const grantedScopes = tokens.scope ? tokens.scope.split(" ") : [...YOUTUBE_SCOPES];
  const { data: connection, error: connectionError } = await admin
    .from("youtube_connections")
    .upsert({
      user_id: userId,
      channel_id: channel.id,
      channel_title: channel.title,
      channel_thumbnail_url: channel.thumbnailUrl,
      status: "syncing",
      scopes: grantedScopes,
      token_expires_at: expiresAt.toISOString(),
      last_synced_at: now.toISOString(),
      last_error_code: null,
      updated_at: now.toISOString(),
    }, { onConflict: "user_id" })
    .select("id")
    .single();

  if (connectionError || !connection) {
    // The unique channel constraint is authoritative; this second check also covers
    // a competing connection that completed after the friendly preflight check.
    const competingOwnerHint = await findChannelOwnerHint(userId, channel.id);
    if (competingOwnerHint) throw new YouTubeChannelAlreadyConnectedError(competingOwnerHint);
    throw new Error("The YouTube connection record could not be saved.");
  }

  const encryptedRefreshToken = encryptRefreshToken(
    tokens.refresh_token,
    requireYouTubeEnvironment().tokenEncryptionKey,
  );
  const { error: credentialError } = await admin.rpc("store_youtube_credentials", {
    p_connection_id: connection.id,
    p_ciphertext_base64: encryptedRefreshToken,
  });
  if (credentialError) {
    await admin.from("youtube_connections").delete().eq("id", connection.id).eq("user_id", userId);
    throw new Error("The YouTube credentials could not be stored securely.");
  }

  const date = now.toISOString().slice(0, 10);
  const snapshotExpiry = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const { error: snapshotError } = await admin.from("channel_snapshots").insert({
    user_id: userId,
    connection_id: connection.id,
    period_start: date,
    period_end: date,
    metrics: {
      lifetime: channel.statistics,
      channel: { id: channel.id, title: channel.title, thumbnailUrl: channel.thumbnailUrl },
      recentVideos: channel.recentVideos,
      source: "youtube_data_api",
    },
    captured_at: now.toISOString(),
    expires_at: snapshotExpiry.toISOString(),
  });

  if (snapshotError) {
    await admin.from("youtube_connections").update({
      status: "stale",
      last_error_code: "initial_snapshot_failed",
      updated_at: new Date().toISOString(),
    }).eq("id", connection.id).eq("user_id", userId);
  }

  const { data: preferences } = await admin
    .from("user_preferences")
    .select("default_script_preferences")
    .eq("user_id", userId)
    .maybeSingle();
  const currentDefaults = preferences?.default_script_preferences
    && typeof preferences.default_script_preferences === "object"
    && !Array.isArray(preferences.default_script_preferences)
    ? preferences.default_script_preferences
    : {};
  const preservedDefaults = { ...currentDefaults };
  [
    "channelNiche",
    "channelNicheId",
    "channelNicheChannelId",
    "channelNicheConfirmedAt",
    "channelSetupStatus",
    "channelSetupChannelId",
    "channelSetupStartedAt",
    "channelSetupCompletedAt",
    "channelSetupError",
  ].forEach((key) => delete preservedDefaults[key]);
  await admin.from("user_preferences").update({
    default_script_preferences: {
      ...preservedDefaults,
      channelSetupStatus: "awaiting_niche",
      channelSetupChannelId: channel.id,
    } as Json,
  }).eq("user_id", userId);
  await admin.from("ideas").delete().eq("user_id", userId).eq("status", "recommended");

  return connection.id;
}

export async function disconnectYouTube(userId: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("youtube_connections").delete().eq("user_id", userId);
  if (error) throw new Error("The YouTube connection could not be removed.");
}
