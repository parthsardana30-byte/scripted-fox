import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { HomeDashboard } from "@/components/dashboard/home-dashboard";

afterEach(cleanup);

describe("HomeDashboard connection state", () => {
  it("shows one focused YouTube action without restoring the old setup checklist", () => {
    render(<HomeDashboard setup={{ accountCreated: true, channelConnected: false, preferencesSet: false }} userName="Aryan" />);

    expect(screen.getByRole("heading", { name: /Aryan/ })).toBeVisible();
    expect(screen.getByRole("link", { name: "Connect YouTube" })).toHaveAttribute("href", "/connect");
    expect(screen.queryByRole("heading", { name: "Finish setup" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Set preferences" })).not.toBeInTheDocument();
  });

  it("removes the setup panel when every setup step is finished", () => {
    render(<HomeDashboard setup={{ accountCreated: true, channelConnected: true, preferencesSet: true }} channelName="Scripted Fox TV" />);

    expect(screen.queryByRole("link", { name: /Current plan:/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Connected YouTube channel: Scripted Fox TV" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Setup complete" })).not.toBeInTheDocument();
    expect(screen.queryByText("3 of 3")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Connect channel" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Set preferences" })).not.toBeInTheDocument();
  });

  it("does not repeat the primary sidebar actions on the home page", () => {
    render(<HomeDashboard setup={{ accountCreated: true, channelConnected: true, preferencesSet: true }} />);

    expect(screen.queryByRole("link", { name: "Start a script" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Find an idea" })).not.toBeInTheDocument();
  });
});
