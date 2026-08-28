export type PublicVideoSignal = {
  id: string;
  title: string;
  channelTitle: string;
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
    return { ...video, viewsPerDay, engagementRate, freshness };
  });
  const maximumVelocity = Math.max(0, ...prepared.map((video) => video.viewsPerDay));
  const maximumEngagement = Math.max(0, ...prepared.map((video) => video.engagementRate));

  return prepared
    .map((video) => ({
      ...video,
      score: Math.round(100 * (
        normalizeLog(video.viewsPerDay, maximumVelocity) * 0.55
        + normalizeLog(video.engagementRate, maximumEngagement) * 0.25
        + video.freshness * 0.2
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
