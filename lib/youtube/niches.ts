export type CreatorNiche = {
  id: string;
  label: string;
  category: string;
  keywords: string[];
};

export const creatorNiches: CreatorNiche[] = [
  { id: "music", label: "Music", category: "music", keywords: ["songs", "audio"] },
  { id: "music-production", label: "Music Production", category: "music", keywords: ["producer", "mixing", "mastering"] },
  { id: "music-reviews", label: "Music Reviews", category: "music", keywords: ["album reviews", "song reactions"] },
  { id: "musical-instruments", label: "Musical Instruments", category: "music", keywords: ["instruments", "gear"] },
  { id: "piano-covers", label: "Piano Covers", category: "music", keywords: ["piano rendition", "piano instrumental"] },
  { id: "guitar-covers", label: "Guitar Covers", category: "music", keywords: ["acoustic cover", "guitar songs"] },
  { id: "song-covers", label: "Song Covers", category: "music", keywords: ["vocal cover", "cover songs", "singing"] },
  { id: "gaming", label: "Gaming", category: "gaming", keywords: ["gameplay", "games", "esports"] },
  { id: "pubg-gaming", label: "BGMI & PUBG", category: "gaming", keywords: ["battlegrounds mobile", "pubg gaming"] },
  { id: "minecraft-gaming", label: "Minecraft", category: "gaming", keywords: ["minecraft gaming"] },
  { id: "roblox-gaming", label: "Roblox", category: "gaming", keywords: ["roblox gaming"] },
  { id: "free-fire-gaming", label: "Free Fire", category: "gaming", keywords: ["freefire gaming"] },
  { id: "gta-gaming", label: "GTA", category: "gaming", keywords: ["grand theft auto", "gta gaming"] },
  { id: "technology", label: "Technology", category: "technology", keywords: ["tech", "gadgets"] },
  { id: "tech-reviews", label: "Tech Reviews", category: "technology", keywords: ["gadget reviews", "device reviews"] },
  { id: "smartphones", label: "Smartphones", category: "technology", keywords: ["android", "iphone", "mobile reviews"] },
  { id: "ai-tools", label: "AI Tools", category: "technology", keywords: ["artificial intelligence", "chatgpt", "gemini"] },
  { id: "software-tutorials", label: "Software Tutorials", category: "technology", keywords: ["apps", "how to software"] },
  { id: "coding", label: "Coding", category: "technology", keywords: ["programming", "web development"] },
  { id: "creator-education", label: "Creator Education", category: "creator", keywords: ["youtube growth", "content creator", "youtube tips"] },
  { id: "video-editing", label: "Video Editing", category: "creator", keywords: ["editing tutorials", "premiere pro", "davinci resolve"] },
  { id: "photography", label: "Photography", category: "creator", keywords: ["camera", "photo editing"] },
  { id: "podcasts", label: "Podcasts", category: "creator", keywords: ["interviews", "talk show"] },
  { id: "personal-finance", label: "Personal Finance", category: "business", keywords: ["money", "saving", "budgeting"] },
  { id: "investing", label: "Investing", category: "business", keywords: ["stocks", "mutual funds", "wealth"] },
  { id: "business", label: "Business", category: "business", keywords: ["company", "startups"] },
  { id: "entrepreneurship", label: "Entrepreneurship", category: "business", keywords: ["founder", "small business"] },
  { id: "digital-marketing", label: "Digital Marketing", category: "business", keywords: ["seo", "social media marketing"] },
  { id: "education", label: "Education", category: "learning", keywords: ["learning", "teaching"] },
  { id: "study-tips", label: "Study Tips", category: "learning", keywords: ["students", "exams", "studying"] },
  { id: "language-learning", label: "Language Learning", category: "learning", keywords: ["english", "spoken language"] },
  { id: "science", label: "Science", category: "learning", keywords: ["experiments", "physics", "biology"] },
  { id: "history", label: "History", category: "learning", keywords: ["historical", "documentary"] },
  { id: "cooking", label: "Cooking", category: "food", keywords: ["kitchen", "food"] },
  { id: "recipes", label: "Recipes", category: "food", keywords: ["recipe", "meal ideas"] },
  { id: "baking", label: "Baking", category: "food", keywords: ["cakes", "bread", "desserts"] },
  { id: "food-reviews", label: "Food Reviews", category: "food", keywords: ["restaurants", "street food"] },
  { id: "fitness", label: "Fitness", category: "wellness", keywords: ["workout", "gym", "exercise"] },
  { id: "yoga", label: "Yoga", category: "wellness", keywords: ["meditation", "yoga practice"] },
  { id: "health-wellness", label: "Health & Wellness", category: "wellness", keywords: ["healthy lifestyle", "wellbeing"] },
  { id: "beauty", label: "Beauty", category: "lifestyle", keywords: ["makeup", "skincare"] },
  { id: "fashion", label: "Fashion", category: "lifestyle", keywords: ["style", "clothing"] },
  { id: "travel", label: "Travel", category: "lifestyle", keywords: ["destinations", "travel guide", "tourism"] },
  { id: "vlogging", label: "Vlogging", category: "lifestyle", keywords: ["daily vlog", "life vlog"] },
  { id: "comedy", label: "Comedy", category: "entertainment", keywords: ["funny", "sketches", "humor"] },
  { id: "film-tv-reviews", label: "Film & TV Reviews", category: "entertainment", keywords: ["movies", "series", "cinema"] },
  { id: "book-reviews", label: "Book Reviews", category: "entertainment", keywords: ["books", "reading"] },
  { id: "animation", label: "Animation", category: "entertainment", keywords: ["animated", "cartoons"] },
  { id: "sports", label: "Sports", category: "sports", keywords: ["athletics", "sports news"] },
  { id: "cricket", label: "Cricket", category: "sports", keywords: ["ipl", "cricket analysis"] },
  { id: "football", label: "Football", category: "sports", keywords: ["soccer", "football analysis"] },
  { id: "automotive", label: "Automotive", category: "vehicles", keywords: ["cars", "car reviews"] },
  { id: "motorcycles", label: "Motorcycles", category: "vehicles", keywords: ["bikes", "motorbike reviews"] },
  { id: "diy-crafts", label: "DIY & Crafts", category: "home", keywords: ["crafts", "do it yourself"] },
  { id: "home-improvement", label: "Home Improvement", category: "home", keywords: ["renovation", "interior design"] },
  { id: "productivity", label: "Productivity", category: "self-development", keywords: ["habits", "time management"] },
  { id: "motivation", label: "Motivation", category: "self-development", keywords: ["inspiration", "self improvement"] },
  { id: "spirituality", label: "Spirituality", category: "self-development", keywords: ["faith", "spiritual growth"] },
];

const defaultNicheIds = [
  "creator-education", "ai-tools", "gaming", "music", "personal-finance",
  "technology", "fitness", "cooking", "travel", "comedy", "education",
  "video-editing", "beauty", "cricket", "productivity",
];

function normalized(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9&]+/g, " ").trim();
}

function relevanceScore(niche: CreatorNiche, rawQuery: string) {
  const query = normalized(rawQuery);
  if (!query) return 0;
  const label = normalized(niche.label);
  const terms = [label, ...niche.keywords.map(normalized)];
  if (label === query) return 1_000;
  if (label.startsWith(query)) return 900 - (label.length - query.length);
  if (label.split(" ").some((word) => word.startsWith(query))) return 800 - label.length;
  if (terms.some((term) => term.startsWith(query))) return 700 - label.length;
  if (terms.some((term) => query.startsWith(term))) return 650 - label.length;
  if (terms.some((term) => term.includes(query))) return 600 - label.length;
  let position = 0;
  if ([...query].every((character) => {
    const matchAt = label.indexOf(character, position);
    if (matchAt < 0) return false;
    position = matchAt + 1;
    return true;
  })) {
    return 300 - label.length;
  }
  return 0;
}

export function nicheById(id: string) {
  return creatorNiches.find((niche) => niche.id === id) ?? null;
}

export function closestNiche(value: string) {
  if (!normalized(value)) return nicheById("creator-education")!;
  return [...creatorNiches]
    .map((niche) => ({ niche, score: relevanceScore(niche, value) }))
    .sort((a, b) => b.score - a.score || a.niche.label.localeCompare(b.niche.label))[0]?.niche
    ?? nicheById("creator-education")!;
}

export function rankedNiches(query: string, selectedId: string, limit = 15) {
  const selected = nicheById(selectedId) ?? nicheById("creator-education")!;
  const relevantDefaults = [
    selected,
    ...creatorNiches.filter((niche) => niche.category === selected.category),
    ...defaultNicheIds.map(nicheById).filter((niche): niche is CreatorNiche => Boolean(niche)),
    ...creatorNiches,
  ].filter((niche, index, items) => items.findIndex((item) => item.id === niche.id) === index);

  if (!query.trim()) return relevantDefaults.slice(0, limit);

  const matches = creatorNiches
    .map((niche) => ({ niche, score: relevanceScore(niche, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.niche.label.localeCompare(b.niche.label))
    .map(({ niche }) => niche);
  return [...matches, ...relevantDefaults]
    .filter((niche, index, items) => items.findIndex((item) => item.id === niche.id) === index)
    .slice(0, limit);
}
