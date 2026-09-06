const nicheRules = [
  { niche: "PUBG gaming", terms: ["pubg", "bgmi", "battlegrounds mobile"] },
  { niche: "Roblox gaming", terms: ["roblox"] },
  { niche: "Minecraft gaming", terms: ["minecraft", "mooshroom"] },
  { niche: "Free Fire gaming", terms: ["free fire", "freefire"] },
  { niche: "GTA gaming", terms: ["gta", "grand theft auto"] },
  { niche: "Gaming", terms: ["gameplay", "gaming", "gamer", "esports", "rank push", "clutch", "teammate", "camper"] },
  { niche: "AI tools", terms: ["artificial intelligence", "chatgpt", "gemini ai", "claude ai", "ai tool", "ai tools"] },
  { niche: "Music", terms: ["music video", "official audio", "song cover", "piano cover", "guitar cover", "remix"] },
  { niche: "Technology", terms: ["tech review", "smartphone", "laptop", "android", "iphone", "gadget"] },
  { niche: "Cooking", terms: ["recipe", "cooking", "kitchen", "baking"] },
] as const;

function occurrences(text: string, term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return text.match(new RegExp(`(?:^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`, "gi"))?.length ?? 0;
}

export function inferNicheFromVideoTitles(titles: string[]) {
  const evidence = titles.slice(0, 20).join("\n").toLowerCase();
  if (!evidence.trim()) return null;

  const ranked = nicheRules
    .map((rule, index) => ({
      index,
      niche: rule.niche,
      score: rule.terms.reduce((total, term) => total + occurrences(evidence, term), 0),
    }))
    .filter((rule) => rule.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return ranked[0]?.niche ?? null;
}