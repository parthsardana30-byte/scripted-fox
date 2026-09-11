import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { YouTubeConnectionDialog } from "@/components/youtube/youtube-connection-dialog";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/components/youtube/disconnect-button", () => ({ DisconnectYouTubeButton: () => <button>Disconnect YouTube</button> }));

afterEach(() => {
  cleanup();
  replace.mockClear();
});

describe("YouTubeConnectionDialog", () => {
  it("shows a compact connection modal and closes back to the dashboard", async () => {
    const user = userEvent.setup();
    render(<YouTubeConnectionDialog connected={false} />);

    expect(screen.getByRole("dialog", { name: "Connect your YouTube channel" })).toBeVisible();
    expect(screen.getByRole("link", { name: /Continue with Google/ })).toHaveAttribute("href", "/api/youtube/connect");
    expect(screen.queryByRole("button", { name: "Disconnect YouTube" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Not now" }));
    expect(replace).toHaveBeenCalledWith("/dashboard");
  });

  it("shows reconnect and disconnect controls for an active channel", () => {
    render(<YouTubeConnectionDialog connected channelTitle="Aryan Keys" />);

    expect(screen.getByRole("dialog", { name: "Aryan Keys" })).toBeVisible();
    expect(screen.getByRole("link", { name: /Reconnect channel/ })).toHaveAttribute("href", "/api/youtube/connect");
    expect(screen.getByRole("button", { name: "Disconnect YouTube" })).toBeVisible();
  });
});
