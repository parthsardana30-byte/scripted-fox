export type PublicVideoSignal = {
  id: string;
  channelId?: string;
  title: string;
  description?: string;
  tags?: string[];
  discoveryQuery?: string;
  channelTitle: string;
  channelSubscribers?: number | null;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  market: string;
  language: string;
  discovery: "popular" | "search";
};

export type ScoredTrendVideo = PublicVideoSignal & {
  viewsPerDay: number;
  engagementRate: number;
  freshness: number;
  audienceBreakout: number;
  score: number;
};

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeLog(value: number, maximum: number) {
  if (value <= 0 || maximum <= 0) return 0;
  return clamp(Math.log1p(value) / Math.log1p(maximum));
}

export function scoreTrendVideos(videos: PublicVideoSignal[], now = new Date()): ScoredTrendVideo[] {
  const prepared = videos.map((video) => {
    const ageDays = Math.max(0.25, (now.getTime() - new Date(video.publishedAt).getTime()) / 86_400_000);
    const viewsPerDay = video.views / ageDays;
    const engagementRate = video.views > 0 ? (video.likes + video.comments) / video.views : 0;
    const freshness = clamp(1 - ageDays / 30);
    const audienceBreakout = video.channelSubscribers && video.channelSubscribers > 0
      ? video.views / video.channelSubscribers
      : 0;
    return { ...video, viewsPerDay, engagementRate, freshness, audienceBreakout };
  });
  const maximumVelocity = Math.max(0, ...prepared.map((video) => video.viewsPerDay));
  const maximumEngagement = Math.max(0, ...prepared.map((video) => video.engagementRate));
  const maximumBreakout = Math.max(0, ...prepared.map((video) => video.audienceBreakout));

  return prepared
    .map((video) => ({
      ...video,
      score: Math.round(100 * (
        normalizeLog(video.viewsPerDay, maximumVelocity) * 0.43
        + normalizeLog(video.engagementRate, maximumEngagement) * 0.2
        + video.freshness * 0.17
        + normalizeLog(video.audienceBreakout, maximumBreakout) * 0.2
      )),
    }))
    .sort((a, b) => b.score - a.score || b.viewsPerDay - a.viewsPerDay);
}

const STOP_WORDS = new Set([
  "about", "after", "again", "best", "from", "have", "into", "just", "more", "that", "their", "this", "video", "what", "when", "with", "your",
  "और", "एक", "का", "की", "के", "में", "है", "से",
]);

export function topicTokens(value: string) {
  return new Set(value
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((token) => {
      if (/^[a-z]+$/.test(token) && token.length > 5) {
        if (token.endsWith("ing") || token.endsWith("est") || token.endsWith("ers")) return token.slice(0, -3);
        if (token.endsWith("ed")) return token.slice(0, -2);
      }
      return token;
    })
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token)));
}

export function relevanceScore(title: string, candidate: string) {
  const requested = topicTokens(title);
  if (requested.size === 0) return 0;
  const available = topicTokens(candidate);
  let overlap = 0;
  requested.forEach((token) => { if (available.has(token)) overlap += 1; });
  return overlap / requested.size;
}

type DiversifiableTrend = {
  id: string;
  title: string;
  channelTitle: string;
  score: number;
  outlook?: "rising-now" | "breakout-candidate" | "steady";
};

function titleSimilarity(leftTokens: Set<string>, rightTokens: Set<string>) {
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;
  let intersection = 0;
  leftTokens.forEach((token) => { if (rightTokens.has(token)) intersection += 1; });
  return intersection / (leftTokens.size + rightTokens.size - intersection);
}

export function selectDiverseTrends<T extends DiversifiableTrend>(videos: T[], limit: number, recentlyShownIds: Set<string> = new Set()) {
  const ordered = [...videos].sort((left, right) => {
    const leftSeen = recentlyShownIds.has(left.id) && left.outlook !== "rising-now" ? 1 : 0;
    const rightSeen = recentlyShownIds.has(right.id) && right.outlook !== "rising-now" ? 1 : 0;
    return leftSeen - rightSeen || right.score - left.score;
  });
  const buckets = [
    ordered.filter((video) => video.outlook === "rising-now"),
    ordered.filter((video) => video.outlook === "breakout-candidate"),
    ordered.filter((video) => video.outlook !== "rising-now" && video.outlook !== "breakout-candidate"),
  ];
  const selected: T[] = [];
  const selectedIds = new Set<string>();
  const tokensByTitle = new Map<string, Set<string>>();
  const tokensFor = (title: string) => {
    let tokens = tokensByTitle.get(title);
    if (!tokens) {
      tokens = topicTokens(title);
      tokensByTitle.set(title, tokens);
    }
    return tokens;
  };
  const channelCounts = new Map<string, number>();
  const tryAdd = (video: T) => {
    if (selectedIds.has(video.id)) return false;
    if ((channelCounts.get(video.channelTitle) ?? 0) >= 2) return false;
    const tokens = tokensFor(video.title);
    if (selected.some((item) => titleSimilarity(tokensFor(item.title), tokens) >= .72)) return false;
    selected.push(video);
    selectedIds.add(video.id);
    channelCounts.set(video.channelTitle, (channelCounts.get(video.channelTitle) ?? 0) + 1);
    return true;
  };
  const targets = [4, 3, Math.max(0, limit - 7)];
  buckets.forEach((bucket, index) => {
    let added = 0;
    for (const video of bucket) {
      if (selected.length >= limit || added >= targets[index]) break;
      if (tryAdd(video)) added += 1;
    }
  });
  ordered.forEach((video) => { if (selected.length < limit) tryAdd(video); });
  return selected;
}
