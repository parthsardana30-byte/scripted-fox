import { dashboardSnapshot, extraRecommendations } from "@/lib/dashboard-mocks";
import type { DashboardSnapshot, IdeaRecommendation } from "@/types/dashboard";

const delay = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export const dashboardService = {
  async getSnapshot(): Promise<DashboardSnapshot> {
    return dashboardSnapshot;
  },
  async getMoreIdeas(): Promise<IdeaRecommendation[]> {
    await delay(650);
    return extraRecommendations;
  },
  async generateDraft(title: string): Promise<{ projectId: string; title: string }> {
    await delay(900);
    return { projectId: "new-script", title };
  },
};
