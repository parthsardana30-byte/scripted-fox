import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SettingsView } from "@/components/dashboard/settings-view";

vi.mock("@/app/dashboard/settings/actions", () => ({
  saveSettings: vi.fn(async () => ({ status: "success", message: "Preferences saved." })),
  disconnectYouTubeFromSettings: vi.fn(async () => ({ status: "success", message: "YouTube channel disconnected." })),
}));

vi.mock("@/app/(auth)/actions", () => ({ signOut: vi.fn() }));
vi.mock("@/app/dashboard/account/actions", () => ({
  updateCreatorProfile: vi.fn(),
  deleteAccount: vi.fn(async () => ({ status: "idle", message: "" })),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

vi.mock("@/app/dashboard/actions", () => ({
  confirmYouTubeNiche: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const account = {
  displayName: "Aryan Atharv", email: "aryan@example.com", memberSince: "6 Sept 2026",
  signInMethod: "Google", hasPassword: false, hasGoogle: true, channelNiche: "Piano Covers",
  channelGoal: "growth" as const,
  connection: { active: true, title: "Aryan Keys", status: "Status: connected" },
  plan: { name: "Plus", description: "Trial access is active." },
};

describe("SettingsView", () => {
  it("shows the simplified creator and script preferences", () => {
    render(<SettingsView account={account} initialValues={{
      language: "hi",
      secondaryLanguage: "en",
      market: "IN",
      tone: "educational",
      videoLength: "10-15",
      openingStyle: "story",
    }} />);

    expect(screen.getByLabelText("Primary language")).toHaveValue("hi");
    expect(screen.getByLabelText("Secondary language")).toHaveValue("en");
    expect(screen.getByLabelText("Default opening")).toHaveValue("story");
    expect(screen.queryByRole("heading", { name: "Appearance" })).not.toBeInTheDocument();
    expect(screen.queryByText("Export and editor")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Outline detail")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save all settings" })).toBeEnabled();
  });

  it("lets a connected creator reopen the niche selector", async () => {
    const user = userEvent.setup();
    render(<SettingsView account={account} channel={{ name: "Aryan Keys", niche: "Piano Covers" }} initialValues={{
      language: "en",
      secondaryLanguage: "none",
      market: "IN",
      tone: "clear",
      videoLength: "7-10",
      openingStyle: "value-first",
    }} />);

    expect(screen.getByRole("heading", { name: "Channel personalization" })).toBeVisible();
    expect(screen.getByText("Piano Covers")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Change niche" }));
    expect(screen.getByRole("dialog", { name: "Change your channel niche" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Save niche" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Close dialog" })).toBeVisible();
  });

  it("opens account management in a compact dialog", async () => {
    const user = userEvent.setup();
    render(<SettingsView account={account} initialValues={{ language: "en", secondaryLanguage: "none", market: "IN", tone: "clear", videoLength: "7-10", openingStyle: "value-first" }} />);
    await user.click(screen.getByRole("button", { name: /Manage account/ }));
    const dialog = screen.getByRole("dialog", { name: "Manage account" });
    expect(dialog).toBeVisible();
    await waitFor(() => expect(dialog).toHaveFocus());
    expect(screen.getByLabelText("Display name")).not.toHaveFocus();
    expect(screen.getAllByText("aryan@example.com")).toHaveLength(2);
    expect(screen.getByText("Aryan Keys")).toBeVisible();
    expect(screen.getByRole("link", { name: "Reconnect" })).toHaveAttribute("href", "/api/youtube/connect");
    expect(screen.queryByRole("link", { name: "Manage" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Disconnect" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Delete account" })).toBeVisible();

    vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Disconnect" }));
    expect(await screen.findByText("YouTube channel disconnected.")).toBeVisible();
    expect(screen.getByText("No channel connected")).toBeVisible();
  });
});
