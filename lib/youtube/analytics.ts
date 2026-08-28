import "server-only";

import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireYouTubeEnvironment } from "@/lib/youtube/config";
import { decryptRefreshToken } from "@/lib/youtube/crypto";
import {
  getConnectedYouTubeChannel,
  getYouTubeAnalyticsPeriod,
  refreshYouTubeAccessToken,
  YouTubeApiError,
} from "@/lib/youtube/google";
import type { Json } from "@/types/database";

const CACHE_HOURS = 6;
const SNAPSHOT_SCHEMA = "youtube_channel_analytics_v1";

const analyticsSnapshotSchema = z.object({
  schema: z.literal(SNAPSHOT_SCHEMA),
  channel: z.object({
    id: z.string(),
    title: z.string(),
    thumbnailUrl: z.string().nullable(),
    lifetime: z.object({
      views: z.number().nullable(),
      subscribers: z.number().nullable(),
      subscribersHidden: z.boolean(),
      videos: z.number().nullable(),
    }),
  }),
  period: z.object({ start: z.string(), end: z.string() }),
  summary: z.object({
    views: z.number(),
    watchTimeMinutes: z.number(),
    averageViewDurationSeconds: z.number(),
    subscribersGained: z.number(),
    subscribersLost: z.number(),
  }),
  daily: z.array(z.object({ date: z.string(), views: z.number() })),
  topVideos: z.array(z.object({
    id: z.string(),
    title: z.string(),
    views: z.number(),
    watchTimeMinutes: z.number(),
    averageViewDurationSeconds: z.number(),
    averageViewPercentage: z.number(),
    subscribersGained: z.number(),
  })),
  capturedAt: z.string(),
});

export type AnalyticsSnapshot = z.infer<typeof analyticsSnapshotSchema>;
export type ChannelAnalyticsState =
  | { kind: "disconnected" }
  | { kind: "permission_expired"; channelTitle: string | null }
  | { kind: "unavailable"; channelTitle: string | null }
  | { kind: "ready"; snapshot: AnalyticsSnapshot; isStale: boolean };

type Connection = {
  id: string;
  user_id: string;
  channel_title: string | null;
  status: string;
};

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function analyticsWindow() {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 27);
  return { start: isoDate(start), end: isoDate(end) };
}

async function latestSnapshot(userId: string, connectionId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("channel_snapshots")
    .select("metrics,expires_at")
    .eq("user_id", userId)
    .eq("connection_id", connectionId)
    .order("captured_at", { ascending: false })
    .limit(10);

  for (const row of data ?? []) {
    const parsed = analyticsSnapshotSchema.safeParse(row.metrics);
    if (parsed.success) {
      return {
        snapshot: parsed.data,
        fresh: Boolean(row.expires_at && new Date(row.expires_at).getTime() > Date.now()),
      };
    }
  }
  return null;
}

async function syncAnalytics(connection: Connection): Promise<AnalyticsSnapshot> {
  const admin = createAdminClient();
  const { data: encryptedToken, error: credentialError } = await admin.rpc(
    "read_youtube_credentials",
    { p_connection_id: connection.id },
  );
  if (credentialError || !encryptedToken) throw new YouTubeApiError("YouTube credentials are unavailable.", "authorization");

  const refreshToken = decryptRefreshToken(
    encryptedToken,
    requireYouTubeEnvironment().tokenEncryptionKey,
  );
  const tokens = await refreshYouTubeAccessToken(refreshToken);
  const period = analyticsWindow();
  const [channel, analytics] = await Promise.all([
    getConnectedYouTubeChannel(tokens.access_token),
    getYouTubeAnalyticsPeriod(tokens.access_token, period.start, period.end),
  ]);
  const capturedAt = new Date();
  const snapshot: AnalyticsSnapshot = {
    schema: SNAPSHOT_SCHEMA,
    channel: {
      id: channel.id,
      title: channel.title,
      thumbnailUrl: channel.thumbnailUrl,
      lifetime: channel.statistics,
    },
    period,
    ...analytics,
    capturedAt: capturedAt.toISOString(),
  };
  const expiresAt = new Date(capturedAt.getTime() + CACHE_HOURS * 60 * 60 * 1000);
  const tokenExpiresAt = new Date(capturedAt.getTime() + tokens.expires_in * 1000);

  const { error: snapshotError } = await admin.from("channel_snapshots").insert({
    user_id: connection.user_id,
    connection_id: connection.id,
    period_start: period.start,
    period_end: period.end,
    metrics: snapshot as unknown as Json,
    captured_at: capturedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
  });
  if (snapshotError) throw new YouTubeApiError("YouTube analytics could not be cached.", "unavailable");

  if (snapshot.topVideos.length > 0) {
    await admin.from("video_metrics").insert(snapshot.topVideos.map((video) => ({
      user_id: connection.user_id,
      connection_id: connection.id,
      youtube_video_id: video.id,
      title: video.title,
      published_at: null,
      metrics: video as unknown as Json,
      captured_at: capturedAt.toISOString(),
    })));
  }

  await admin.from("youtube_connections").update({
    channel_id: channel.id,
    channel_title: channel.title,
    channel_thumbnail_url: channel.thumbnailUrl,
    status: "connected",
    token_expires_at: tokenExpiresAt.toISOString(),
    last_synced_at: capturedAt.toISOString(),
    last_error_code: null,
    updated_at: capturedAt.toISOString(),
  }).eq("id", connection.id).eq("user_id", connection.user_id);

  return snapshot;
}

export async function getChannelAnalytics(userId: string): Promise<ChannelAnalyticsState> {
  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("youtube_connections")
    .select("id,user_id,channel_title,status")
    .eq("user_id", userId)
    .maybeSingle();

  if (!connection) return { kind: "disconnected" };
  if (connection.status === "permission_expired") {
    return { kind: "permission_expired", channelTitle: connection.channel_title };
  }

  const cached = await latestSnapshot(userId, connection.id);
  if (cached?.fresh) return { kind: "ready", snapshot: cached.snapshot, isStale: false };

  try {
    const snapshot = await syncAnalytics(connection);
    return { kind: "ready", snapshot, isStale: false };
  } catch (error) {
    const permissionExpired = error instanceof YouTubeApiError && error.code === "authorization";
    const status = permissionExpired ? "permission_expired" : cached ? "stale" : "error";
    await admin.from("youtube_connections").update({
      status,
      last_error_code: permissionExpired ? "youtube_authorization_failed" : "youtube_sync_failed",
      updated_at: new Date().toISOString(),
    }).eq("id", connection.id).eq("user_id", userId);

    if (cached) return { kind: "ready", snapshot: cached.snapshot, isStale: true };
    return permissionExpired
      ? { kind: "permission_expired", channelTitle: connection.channel_title }
      : { kind: "unavailable", channelTitle: connection.channel_title };
  }
}
