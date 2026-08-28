import type { DashboardSnapshot, IdeaRecommendation } from "@/types/dashboard";

export const dashboardSnapshot: DashboardSnapshot = {
  channelName: "Creator Studio",
  projects: [
    { id: "editing-tools", title: "Five free editing tools, tested", updatedAt: "12 minutes ago", status: "Draft", words: 842, duration: "6 min" },
    { id: "camera-upgrade", title: "The camera upgrade that can wait", updatedAt: "Yesterday", status: "Ready to record", words: 1280, duration: "9 min" },
    { id: "thumbnail-system", title: "A thumbnail system for busy creators", updatedAt: "Aug 17", status: "Published", words: 1044, duration: "8 min" },
  ],
  recommendations: [
    {
      id: "edit-faster",
      title: "Edit a YouTube video in half the time",
      angle: "Test a repeatable three-pass editing method on a real video.",
      format: "Practical walkthrough · 8–10 min",
      reason: "Your workflow videos hold attention longer, while searches around faster editing are rising.",
      evidence: [
        { label: "Workflow video retention", value: "+18% vs channel average", source: "Your channel" },
        { label: "Search interest", value: "+24% this month", source: "YouTube trend" },
        { label: "Best audience fit", value: "Returning viewers", source: "Your channel" },
      ],
    },
    {
      id: "shorts-to-longform",
      title: "Turn one Short into a useful long-form video",
      angle: "Expand a proven Short without padding or repeating the same point.",
      format: "Before-and-after breakdown · 7–9 min",
      reason: "Your strongest Short already shows demand, and the topic has room for a deeper answer.",
      evidence: [
        { label: "Short performance", value: "2.3× typical views", source: "Your channel" },
        { label: "Related long-form supply", value: "Low competition", source: "YouTube trend" },
        { label: "Viewer comments", value: "31 asked for details", source: "Your channel" },
      ],
    },
    {
      id: "creator-budget",
      title: "What a new creator should actually buy first",
      angle: "Rank upgrades by the problems they solve, not by price or hype.",
      format: "Opinionated guide · 9–12 min",
      reason: "Buying guides bring new viewers to your channel, but a problem-first angle is less crowded.",
      evidence: [
        { label: "New-viewer reach", value: "+32% on buying guides", source: "Your channel" },
        { label: "Topic momentum", value: "Growing for 6 weeks", source: "YouTube trend" },
        { label: "Audience match", value: "High", source: "Your channel" },
      ],
    },
    {
      id: "honest-setup",
      title: "My honest one-light YouTube setup",
      angle: "Build a flattering setup in a small room with one affordable light.",
      format: "Setup tutorial · 6–8 min",
      reason: "Simple setup videos align with the practical questions your newer viewers ask most.",
      evidence: [
        { label: "Setup comments", value: "+41% in 90 days", source: "Your channel" },
        { label: "Search demand", value: "Steady and high", source: "YouTube trend" },
      ],
    },
    {
      id: "hook-rewrite",
      title: "I rewrote five weak YouTube hooks",
      angle: "Show the original, the rewrite, and the principle behind each change.",
      format: "Live teardown · 8–10 min",
      reason: "Your audience responds to concrete examples, and hook tutorials are gaining interest.",
      evidence: [
        { label: "Example-led retention", value: "+13%", source: "Your channel" },
        { label: "Topic growth", value: "+19% this month", source: "YouTube trend" },
      ],
    },
    {
      id: "publish-checklist",
      title: "The 20-minute checklist before you publish",
      angle: "A calm final pass for title, thumbnail, pacing, and viewer promise.",
      format: "Checklist · 5–7 min",
      reason: "Short, repeatable systems are consistently saved by your viewers.",
      evidence: [
        { label: "Save rate", value: "1.8× channel average", source: "Your channel" },
        { label: "Competition", value: "Moderate", source: "YouTube trend" },
      ],
    },
  ],
  insights: [
    { title: "Lead with the result sooner", detail: "Videos that show the final outcome in the first 20 seconds retain more viewers.", action: "Use this in a new script" },
    { title: "Your practical guides travel furthest", detail: "Step-by-step videos bring 32% more new viewers than commentary videos.", action: "See matching ideas" },
    { title: "Seven to ten minutes is your reliable range", detail: "This range has your strongest mix of completion and watch time.", action: "Set as editor target" },
  ],
};

export const extraRecommendations: IdeaRecommendation[] = dashboardSnapshot.recommendations.slice(3);
