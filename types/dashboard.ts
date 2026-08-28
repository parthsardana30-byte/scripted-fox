export type ProjectStatus = "Draft" | "Ready to record" | "Published";

export type ScriptProject = {
  id: string;
  title: string;
  updatedAt: string;
  status: ProjectStatus;
  words: number;
  duration: string;
};

export type IdeaRecommendation = {
  id: string;
  title: string;
  angle: string;
  format: string;
  reason: string;
  evidence: { label: string; value: string; source: "Your channel" | "YouTube trend" }[];
};

export type AnalyticsInsight = {
  title: string;
  detail: string;
  action: string;
};

export type DashboardSnapshot = {
  channelName: string;
  projects: ScriptProject[];
  recommendations: IdeaRecommendation[];
  insights: AnalyticsInsight[];
};
