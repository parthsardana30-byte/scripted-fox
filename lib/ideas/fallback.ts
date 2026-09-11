const fallbackFormats = ["Explainer", "Breakdown", "Tutorial", "Case study", "Comparison"] as const;
const fallbackAngles = [
  "Show the useful pattern, then test how it changes for this creator's audience.",
  "Separate the strongest idea from the presentation choices and rebuild it for the selected niche.",
  "Turn the public signal into a practical sequence viewers can follow and evaluate.",
  "Use the topic as evidence for an experiment, without claiming that one video represents the whole market.",
  "Compare the familiar approach with a clearer alternative tailored to the channel's goal.",
] as const;

export function buildEvidenceBackedFallbackRecommendations(input: {
  niche: string;
  trendSignals: Array<{ id: string; title: string }>;
}) {
  if (input.trendSignals.length === 0) return [];
  return fallbackFormats.map((format, index) => {
    const signal = input.trendSignals[index % input.trendSignals.length];
    const sourceTitle = signal.title.trim().replace(/\s+/g, " ").slice(0, 82);
    const titles = [
      `What “${sourceTitle}” gets right for ${input.niche}`,
      `${input.niche}: the useful pattern behind “${sourceTitle}”`,
      `A practical ${input.niche} take on “${sourceTitle}”`,
      `What to test next after “${sourceTitle}”`,
      `A clearer way to approach ${input.niche}, inspired by “${sourceTitle}”`,
    ];
    return {
      title: titles[index].slice(0, 140),
      angle: fallbackAngles[index],
      format,
      reason: `This is a cautious, original angle grounded in the verified momentum of “${sourceTitle}”.`,
      trendVideoId: signal.id,
    };
  });
}
