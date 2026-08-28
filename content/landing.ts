export type EvidenceItem = {
  source: "channel" | "audience" | "niche";
  label: string;
  detail: string;
};

export type NicheExample = {
  id: string;
  label: string;
  title: string;
  angle: string;
  reason: string;
};

export const recommendation = {
  title: "I Replaced 5 Paid Creator Tools With Free Alternatives",
  angle:
    "A hands-on comparison that shows the switch, the trade-offs, and the final setup—not a generic list of tools.",
  evidence: [
    {
      source: "channel",
      label: "Your channel",
      detail: "Tool comparison videos outperform your usual uploads.",
    },
    {
      source: "audience",
      label: "Your audience",
      detail: "Viewers stay longer when you demonstrate the setup early.",
    },
    {
      source: "niche",
      label: "Your niche right now",
      detail: "Interest is rising, while most current videos skip the migration process.",
    },
  ] satisfies EvidenceItem[],
};

export const planTabs = [
  {
    value: "strategy",
    label: "Video idea",
    title: "One focused promise",
    body: "Test five free editing tools on the same short video and show which one is easiest for a solo creator to keep using.",
    meta: ["Viewer gets: a practical choice", "Format: hands-on comparison"],
  },
  {
    value: "packaging",
    label: "Title & thumbnail",
    title: "Make the choice easy to understand",
    body: "Lead with the result: five free editors tested on one real project. Keep the thumbnail focused on the final shortlist.",
    meta: ["Title: name the test and outcome", "Thumbnail: show the final two choices"],
  },
  {
    value: "script",
    label: "Script",
    title: "Show the test before the explanation",
    body: "Open with the finished video, explain the rules of the comparison, then test each editor in the same order.",
    meta: ["Opening: show the finished result", "Middle: compare the same tasks"],
  },
  {
    value: "recording",
    label: "Recording notes",
    title: "Record the same proof for every tool",
    body: "Capture setup, editing, export, and one limitation for each editor. Keep the same source footage throughout.",
    meta: ["Screen recording: setup to export", "B-roll: the same project in every tool"],
  },
] as const;

export const nicheExamples: NicheExample[] = [
  { id: "technology", label: "Technology", title: "The Laptop Upgrade Nobody Needs Yet", angle: "Test the one workflow where the upgrade changes the result.", reason: "Your audience responds to practical buying decisions, not spec recaps." },
  { id: "gaming", label: "Gaming", title: "I Tried the Strategy Everyone Skips", angle: "Turn an overlooked mechanic into a challenge with a measurable finish.", reason: "Challenge formats hold attention when the rules are clear from the start." },
  { id: "education", label: "Education", title: "Learn This Topic Backwards", angle: "Begin with a finished example, then unpack the decisions in reverse.", reason: "Your viewers stay longer when the outcome appears before the theory." },
  { id: "business", label: "Business", title: "What I Would Automate First With One Afternoon", angle: "Prioritize one repeatable process and show the setup end to end.", reason: "Specific operational walkthroughs outperform broad productivity advice." },
  { id: "lifestyle", label: "Lifestyle", title: "The Routine I Kept After the Experiment Ended", angle: "Frame the video around what survived real life, including what did not.", reason: "Your audience values honest constraints more than perfect routines." },
  { id: "travel", label: "Travel", title: "A Quiet Day Beyond the Usual Itinerary", angle: "Build the story around one local rhythm instead of a checklist of stops.", reason: "Slower, place-specific moments distinguish the angle from standard guides." },
  { id: "fitness", label: "Fitness", title: "The Minimum Plan I Could Actually Repeat", angle: "Test a sustainable baseline and show the adjustment after each session.", reason: "Progress explanations keep viewers watching longer than montage-only videos." },
  { id: "faceless", label: "Faceless", title: "How One Strong Visual Carries the Whole Story", angle: "Use a single evolving diagram instead of unrelated stock footage.", reason: "A consistent visual device makes voiceover-led videos easier to follow." },
];

export const faqs = [
  { question: "Do I need to connect YouTube?", answer: "No. You can start with your own idea. Connecting YouTube adds context from the videos you already make." },
  { question: "What is a Video Plan?", answer: "It is the working plan for one video: the idea, angle, title and thumbnail direction, opening, outline, and recording notes." },
  { question: "Can I edit the plan before creating a script?", answer: "Yes. Review the direction first, change what does not fit, and create the script only when the plan feels right." },
  { question: "Can I bring my own idea?", answer: "Yes. Describe it in the composer and the product will help shape the angle, packaging, outline, and script." },
  { question: "Does the product publish videos?", answer: "No. It helps you decide, plan, write, and prepare to record. You stay in control of filming and publishing." },
];
