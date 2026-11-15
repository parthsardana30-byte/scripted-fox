import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AnalyticsView } from "@/components/dashboard/analytics-view";
import type { ChannelAnalyticsState } from "@/lib/youtube/analytics";

afterEach(cleanup);

describe("AnalyticsView", () => {
  it("shows no channel figures before YouTube is connected", () => {
    render(<AnalyticsView state={{ kind: "disconnected" }} />);

    expect(screen.getByRole("heading", { name: "Connect YouTube to see your analytics" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Connect YouTube" })).toHaveAttribute("href", "/connect");
    expect(screen.queryByText("Views")).not.toBeInTheDocument();
    expect(screen.queryByText("Channel totals")).not.toBeInTheDocument();
  });

  it("renders figures supplied by the connected channel snapshot", () => {
    const state: ChannelAnalyticsState = {
      kind: "ready",
      isStale: false,
      snapshot: {
        schema: "youtube_channel_analytics_v2",
        channel: {
          id: "channel-1",
          title: "Creator channel",
          thumbnailUrl: null,
          lifetime: { views: 1000, subscribers: 50, subscribersHidden: false, videos: 12 },
        },
        period: { start: "2026-07-27", end: "2026-08-23" },
        summary: {
          views: 400,
          watchTimeMinutes: 600,
          averageViewDurationSeconds: 90,
          subscribersGained: 8,
          subscribersLost: 2,
        },
        daily: [{ date: "2026-08-23", views: 400 }],
        topVideos: [{
          id: "video-1",
          title: "A real channel video",
          views: 400,
          watchTimeMinutes: 600,
          averageViewDurationSeconds: 90,
          averageViewPercentage: 60,
          subscribersGained: 8,
        }],
        capturedAt: "2026-08-24T10:00:00.000Z",
      },
    };

    render(<AnalyticsView state={state} syncAction={vi.fn()} />);

    expect(screen.getByText("See what’s working across your channel.")).toBeVisible();
    expect(screen.queryByText(/Creator channel/)).not.toBeInTheDocument();
    expect(screen.getByText("A real channel video")).toBeVisible();
    expect(screen.queryByText("6 gained · 2 lost")).not.toBeInTheDocument();
    expect(screen.getByText("8 gained · 2 lost")).toBeVisible();
    expect(screen.queryByText("Demo channel data")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sync channel analytics" })).toBeEnabled();
  });
});
