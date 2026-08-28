import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { HomeDashboard } from "@/components/dashboard/home-dashboard";

afterEach(cleanup);

describe("HomeDashboard setup checklist", () => {
  it("shows incomplete setup from the supplied account state", () => {
    render(<HomeDashboard setup={{ accountCreated: true, channelConnected: false, preferencesSet: false }} userName="Aryan" />);

    expect(screen.getByRole("heading", { name: /Aryan/ })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Finish setup" })).toBeVisible();
    expect(screen.getByText("1 of 3")).toBeVisible();
    expect(screen.getByRole("link", { name: "Connect channel" })).toHaveAttribute("href", "/connect");
    expect(screen.getByRole("link", { name: "Set preferences" })).toHaveAttribute("href", "/dashboard/settings");
  });

  it("removes the setup panel when every setup step is finished", () => {
    render(<HomeDashboard setup={{ accountCreated: true, channelConnected: true, preferencesSet: true }} />);

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
