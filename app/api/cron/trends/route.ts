import { serverEnvironment } from "@/lib/env/server";
import { createAdminClient } from "@/lib/db/client";
import { estimatedTrendScanQuota, refreshPublicTrends } from "@/lib/youtube/trends";
import type { Json } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function objectValue(value: Json | undefined) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function authorized(request: Request) {
  const secret = serverEnvironment.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized." }, { status: 401 });
  if (!serverEnvironment.YOUTUBE_DATA_API_KEY) {
    return Response.json({ error: "YOUTUBE_DATA_API_KEY is required for scheduled scans." }, { status: 503 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from("user_preferences")
    .select("content_languages,target_markets,default_script_preferences")
    .limit(500);
  if (error) return Response.json({ error: "Creator preferences could not be loaded." }, { status: 500 });

  const groups = new Map<string, { niche: string; markets: string[]; languages: string[] }>();
  for (const row of data ?? []) {
    const defaults = objectValue(row.default_script_preferences);
    const niche = typeof defaults.channelNiche === "string" ? defaults.channelNiche.trim() : "";
    if (!niche) continue;
    const markets = Array.isArray(row.target_markets) ? row.target_markets.filter((item: unknown): item is string => typeof item === "string") : ["IN", "GLOBAL"];
    const languages = Array.isArray(row.content_languages) ? row.content_languages.filter((item: unknown): item is string => typeof item === "string") : ["en"];
    const key = `${niche.toLocaleLowerCase()}|${[...markets].sort().join(",")}|${[...languages].sort().join(",")}`;
    groups.set(key, { niche, markets, languages });
  }

  const dailyQuotaBudget = 9_000;
  let estimatedQuota = 0;
  const pending = [...groups.values()].filter((group) => {
    const cost = estimatedTrendScanQuota(group.markets, group.languages);
    if (estimatedQuota + cost > dailyQuotaBudget) return false;
    estimatedQuota += cost;
    return true;
  });
  const results: Array<{ niche: string; status: "refreshed" | "failed" }> = [];
  for (let index = 0; index < pending.length; index += 2) {
    const batch = pending.slice(index, index + 2);
    const settled = await Promise.allSettled(batch.map((group) => refreshPublicTrends(group)));
    settled.forEach((result, resultIndex) => results.push({ niche: batch[resultIndex].niche, status: result.status === "fulfilled" ? "refreshed" : "failed" }));
  }

  return Response.json({ scannedAt: new Date().toISOString(), groups: results.length, estimatedQuota, quotaBudget: dailyQuotaBudget, results });
}
