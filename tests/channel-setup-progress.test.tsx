import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

import { ChannelSetupProgress } from "@/components/dashboard/channel-setup-progress";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  refresh.mockClear();
});

describe("ChannelSetupProgress", () => {
  it("syncs channel data, prepares topics, then refreshes the dashboard", async () => {
    const request = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "processing" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ideas: [{ id: "1", title: "One" }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "ready" }), { status: 200 }));

    render(<ChannelSetupProgress initialStatus="processing" channelName="Aryan Keys" />);

    expect(screen.getByText("Setting up Aryan Keys")).toBeVisible();
    expect(screen.getByText("Usually ready in about 2 minutes")).toBeVisible();
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(request).toHaveBeenCalledTimes(3);
  });

  it("offers a retry without losing the connected channel", async () => {
    render(<ChannelSetupProgress initialStatus="error" channelName="Aryan Keys" />);

    expect(screen.getByRole("button", { name: /Try again/ })).toBeVisible();
    expect(screen.getByText("Your connection is safe. Resume from the last step.")).toBeVisible();
  });
});
