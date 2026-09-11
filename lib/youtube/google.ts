import "server-only";

import { z } from "zod";

import { requireYouTubeEnvironment, YOUTUBE_SCOPES } from "@/lib/youtube/config";

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  refresh_token: z.string().min(1).optional(),
  scope: z.string().default(""),
  token_type: z.string(),
});

const channelResponseSchema = z.object({
  items: z.array(z.object({
    id: z.string().min(1),
    snippet: z.object({
      title: z.string(),
      thumbnails: z.record(z.string(), z.object({ url: z.url() })).optional(),
    }),
    statistics: z.object({
      viewCount: z.string().optional(),
      subscriberCount: z.string().optional(),
      hiddenSubscriberCount: z.boolean().optional(),
      videoCount: z.string().optional(),
    }),
    contentDetails: z.object({
      relatedPlaylists: z.object({ uploads: z.string().min(1) }),
    }).optional(),
  })).default([]),
});

const playlistItemsResponseSchema = z.object({
  items: z.array(z.object({
    snippet: z.object({
      title: z.string(),
      description: z.string().default(""),
      publishedAt: z.string().optional(),
      resourceId: z.object({ videoId: z.string().min(1) }),
    }),
  })).default([]),
});

const analyticsReportSchema = z.object({
  columnHeaders: z.array(z.object({ name: z.string() })).default([]),
  rows: z.array(z.array(z.union([z.string(), z.number()]))).default([]),
});

const videoResponseSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    snippet: z.object({ title: z.string() }),
  })).default([]),
});

export type YouTubeTokenResponse = z.infer<typeof tokenResponseSchema>;
export type YouTubeChannel = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  statistics: {
    views: number | null;
    subscribers: number | null;
    subscribersHidden: boolean;
    videos: number | null;
  };
  recentVideos: Array<{ id: string; title: string; description: string; publishedAt: string | null }>;
};

export type YouTubeAnalyticsPeriod = {
  summary: {
    views: number;
    watchTimeMinutes: number;
    averageViewDurationSeconds: number;
    subscribersGained: number;
    subscribersLost: number;
  };
  daily: Array<{ date: string; views: number }>;
  topVideos: Array<{
    id: string;
    title: string;
    views: number;
    watchTimeMinutes: number;
    averageViewDurationSeconds: number;
    averageViewPercentage: number;
    subscribersGained: number;
  }>;
};

export class YouTubeApiError extends Error {
  constructor(
    message: string,
    public readonly code: "authorization" | "unavailable",
  ) {
    super(message);
    this.name = "YouTubeApiError";
  }
}

function safeCount(value: string | undefined) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function createYouTubeAuthorizationUrl(state: string, codeChallenge: string) {
  const { clientId, redirectUri } = requireYouTubeEnvironment();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", YOUTUBE_SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url;
}

export async function exchangeYouTubeAuthorizationCode(code: string, codeVerifier: string) {
  const { clientId, clientSecret, redirectUri } = requireYouTubeEnvironment();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) throw new Error("YouTube authorization code exchange failed.");
  return tokenResponseSchema.parse(await response.json());
}

export async function refreshYouTubeAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = requireYouTubeEnvironment();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const payload = z.object({ error: z.string().optional() }).safeParse(
      await response.json().catch(() => null),
    );
    const authorizationFailed = payload.success && payload.data.error === "invalid_grant";
    throw new YouTubeApiError(
      "YouTube access refresh failed.",
      authorizationFailed ? "authorization" : "unavailable",
    );
  }
  return tokenResponseSchema.parse(await response.json());
}

export async function getConnectedYouTubeChannel(accessToken: string): Promise<YouTubeChannel> {
  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "snippet,statistics,contentDetails");
  url.searchParams.set("mine", "true");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const googleError = z.object({
      error: z.object({
        message: z.string().optional(),
        errors: z.array(z.object({ reason: z.string().optional() })).optional(),
      }).optional(),
    }).safeParse(payload);
    const reason = googleError.success
      ? googleError.data.error?.errors?.[0]?.reason
      : undefined;
    const message = googleError.success
      ? googleError.data.error?.message
      : undefined;
    throw new Error([
      "The connected YouTube channel could not be read.",
      `HTTP ${response.status}`,
      reason,
      message,
    ].filter(Boolean).join(" "));
  }
  const result = channelResponseSchema.parse(await response.json());
  const channel = result.items[0];
  if (!channel) throw new Error("This Google account does not have an accessible YouTube channel.");

  const thumbnailUrl = channel.snippet.thumbnails?.high?.url
    ?? channel.snippet.thumbnails?.medium?.url
    ?? channel.snippet.thumbnails?.default?.url
    ?? null;
  const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists.uploads;
  const recentVideos = uploadsPlaylistId
    ? await getRecentChannelVideos(accessToken, uploadsPlaylistId).catch(() => [])
    : [];

  return {
    id: channel.id,
    title: channel.snippet.title,
    thumbnailUrl,
    statistics: {
      views: safeCount(channel.statistics.viewCount),
      subscribers: safeCount(channel.statistics.subscriberCount),
      subscribersHidden: channel.statistics.hiddenSubscriberCount ?? false,
      videos: safeCount(channel.statistics.videoCount),
    },
    recentVideos,
  };
}

async function getRecentChannelVideos(accessToken: string, uploadsPlaylistId: string) {
  const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("playlistId", uploadsPlaylistId);
  url.searchParams.set("maxResults", "25");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new YouTubeApiError("Recent YouTube uploads could not be read.", "unavailable");
  const payload = playlistItemsResponseSchema.parse(await response.json());
  return payload.items.map(({ snippet }) => ({
    id: snippet.resourceId.videoId,
    title: snippet.title,
    description: snippet.description.slice(0, 500),
    publishedAt: snippet.publishedAt ?? null,
  }));
}

function numberValue(value: string | number | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

async function getAnalyticsReport(
  accessToken: string,
  parameters: Record<string, string>,
) {
  const url = new URL("https://youtubeanalytics.googleapis.com/v2/reports");
  Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new YouTubeApiError(
      "YouTube Analytics could not be read.",
      response.status === 401 || response.status === 403 ? "authorization" : "unavailable",
    );
  }

  const report = analyticsReportSchema.parse(await response.json());
  const headers = report.columnHeaders.map(({ name }) => name);
  return report.rows.map((row) => Object.fromEntries(
    headers.map((header, index) => [header, row[index]]),
  ));
}

async function getVideoTitles(accessToken: string, videoIds: string[]) {
  if (videoIds.length === 0) return new Map<string, string>();
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("id", videoIds.join(","));
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new YouTubeApiError("YouTube video details could not be read.", "unavailable");
  const payload = videoResponseSchema.parse(await response.json());
  return new Map(payload.items.map((video) => [video.id, video.snippet.title]));
}

export async function getYouTubeAnalyticsPeriod(
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<YouTubeAnalyticsPeriod> {
  const common = { ids: "channel==MINE", startDate, endDate };
  const [dailyRows, topVideoRows] = await Promise.all([
    getAnalyticsReport(accessToken, {
      ...common,
      dimensions: "day",
      metrics: "views,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost",
      sort: "day",
    }),
    getAnalyticsReport(accessToken, {
      ...common,
      dimensions: "video",
      metrics: "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained",
      sort: "-views",
      maxResults: "5",
    }),
  ]);

  const videoIds = topVideoRows
    .map((row) => String(row.video ?? ""))
    .filter(Boolean);
  const titles = await getVideoTitles(accessToken, videoIds);
  const daily = dailyRows.map((row) => ({
    date: String(row.day ?? ""),
    views: numberValue(row.views),
  })).filter((row) => row.date.length > 0);
  const totals = dailyRows.reduce<{
    views: number;
    watchTimeMinutes: number;
    subscribersGained: number;
    subscribersLost: number;
  }>((total, row) => ({
    views: total.views + numberValue(row.views),
    watchTimeMinutes: total.watchTimeMinutes + numberValue(row.estimatedMinutesWatched),
    subscribersGained: total.subscribersGained + numberValue(row.subscribersGained),
    subscribersLost: total.subscribersLost + numberValue(row.subscribersLost),
  }), {
    views: 0,
    watchTimeMinutes: 0,
    subscribersGained: 0,
    subscribersLost: 0,
  });
  const averageViewDurationSeconds = totals.views > 0
    ? dailyRows.reduce<number>(
        (weightedSeconds, row) => weightedSeconds
          + numberValue(row.averageViewDuration) * numberValue(row.views),
        0,
      ) / totals.views
    : 0;

  return {
    summary: { ...totals, averageViewDurationSeconds },
    daily,
    topVideos: topVideoRows.map((row) => {
      const id = String(row.video ?? "");
      return {
        id,
        title: titles.get(id) ?? "Untitled video",
        views: numberValue(row.views),
        watchTimeMinutes: numberValue(row.estimatedMinutesWatched),
        averageViewDurationSeconds: numberValue(row.averageViewDuration),
        averageViewPercentage: numberValue(row.averageViewPercentage),
        subscribersGained: numberValue(row.subscribersGained),
      };
    }).filter((video) => video.id.length > 0),
  };
}
