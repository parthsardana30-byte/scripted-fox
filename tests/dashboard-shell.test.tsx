import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

const routeState = vi.hoisted(() => ({ pathname: "/dashboard/trending" }));
vi.mock("next/navigation", () => ({ usePathname: () => routeState.pathname }));

afterEach(() => {
  cleanup();
  routeState.pathname = "/dashboard/trending";
});

describe("DashboardShell", () => {
  it("uses the brand logos as Home links without a separate Home button", () => {
    routeState.pathname = "/dashboard";
    const { container } = render(<DashboardShell><h1>Overview</h1></DashboardShell>);
    expect(screen.queryByRole("link", { name: /^Home$/ })).not.toBeInTheDocument();
    expect(container.querySelector(".dashboard-new-script")).toBeNull();
    for (const logo of screen.getAllByRole("link", { name: "Scripted Fox dashboard" })) {
      expect(logo).toHaveAttribute("href", "/dashboard");
      expect(logo).toHaveAttribute("aria-current", "page");
    }
  });
  it("closes mobile navigation when its logo is clicked", async () => {
    const { container } = render(<DashboardShell><h1>Trending</h1></DashboardShell>);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(container.querySelector("aside")).toHaveClass("dashboard-sidebar--open");
    const logo = container.querySelector("aside .dashboard-wordmark")!;
    logo.addEventListener("click", (event) => event.preventDefault());
    await user.click(logo);
    expect(container.querySelector("aside")).not.toHaveClass("dashboard-sidebar--open");
  });
  it("routes preview plan and credits badges to their separate pages", () => {
    render(<DashboardShell previewMode plan="pro"><h1>Preview</h1></DashboardShell>);
    expect(screen.getByRole("link", { name: "Current plan: Pro" })).toHaveAttribute("href", "/ui-preview?view=plans");
    expect(screen.getByRole("link", { name: "Preview: 500 Fox Credits" })).toHaveAttribute("href", "/ui-preview?view=credits");
  });
  it("does not highlight Trending Hub when Home is selected", () => {
    routeState.pathname = "/dashboard";
    const { container } = render(<DashboardShell><h1>Home</h1></DashboardShell>);
    expect(container.querySelector(".dashboard-gooey-effect")).toHaveStyle({ opacity: "0" });
    expect(screen.getByRole("link", { name: "Trending Hub" })).not.toHaveAttribute("aria-current");
  });

  it("uses a persistent liquid selection on the current primary route", () => {
    const { container } = render(<DashboardShell><h1>Trending</h1></DashboardShell>);
    expect(container.querySelector(".dashboard-gooey-effect")).toHaveStyle({ opacity: "1" });
    expect(container.querySelector(".dashboard-gooey-effect")?.getAttribute("style")).toMatch(/url\(["']?#/);
    expect(container.querySelector("feColorMatrix")).toBeInTheDocument();
  });

  it("marks the current page and reveals the desktop navigation on hover", async () => {
    const user = userEvent.setup();
    const { container } = render(<DashboardShell plan="pro"><h1>Ideas</h1></DashboardShell>);
    expect(screen.getByRole("link", { name: "Trending Hub" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Recommendations" })).toHaveAttribute("href", "/dashboard/ideas");
    expect(screen.queryByRole("link", { name: "Account" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Help & Support" })).toHaveLength(1);
    expect(screen.queryByRole("link", { name: "Open Help & Support" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Current plan: Pro" })).toHaveAttribute("href", "/dashboard/upgrade");
    expect(screen.getByRole("main")).toHaveClass("dashboard-main--scroll-frame");
    expect(container.firstChild).toHaveClass("dashboard-app--collapsed");
    await user.hover(screen.getByRole("complementary", { name: "Dashboard navigation" }));
    expect(container.firstChild).not.toHaveClass("dashboard-app--collapsed");
    await user.unhover(screen.getByRole("complementary", { name: "Dashboard navigation" }));
    expect(container.firstChild).toHaveClass("dashboard-app--collapsed");
  });

  it("keeps the selected theme when the dashboard shell remounts", async () => {
    const user = userEvent.setup();
    window.localStorage.clear();
    document.documentElement.dataset.nextVideoTheme = "light";
    const firstRender = render(<DashboardShell><h1>Overview</h1></DashboardShell>);

    await user.click(screen.getAllByRole("switch", { name: "Switch to dark mode" })[0]);
    expect(document.documentElement.dataset.nextVideoTheme).toBe("dark");
    expect(window.localStorage.getItem("scripted-fox:theme")).toBe("dark");

    firstRender.unmount();
    render(<DashboardShell><h1>Another page</h1></DashboardShell>);
    expect(document.documentElement.dataset.nextVideoTheme).toBe("dark");
    await waitFor(() => expect(screen.getAllByRole("switch", { name: "Switch to light mode" })).toHaveLength(2));
  });

  it("hides the global Help shortcut on the Help page", () => {
    routeState.pathname = "/help";
    render(<DashboardShell><h1>Help</h1></DashboardShell>);

    expect(screen.getByRole("main")).toHaveClass("dashboard-main--support");
    expect(screen.queryByRole("link", { name: "Open Help & Support" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Help & Support" })).toHaveLength(1);
    expect(screen.getAllByRole("switch", { name: /Switch to (light|dark) mode/ })).toHaveLength(2);
  });

  it("keeps the Settings workspace inside the viewport frame", () => {
    routeState.pathname = "/dashboard/settings";
    render(<DashboardShell><h1>Settings</h1></DashboardShell>);

    expect(screen.getByRole("main")).toHaveClass("dashboard-main--scroll-frame");
    expect(screen.getByRole("main")).not.toHaveClass("dashboard-main--support");
  });

  it("leaves the full script editor in control of its own viewport", () => {
    routeState.pathname = "/dashboard/editor/project-123";
    render(<DashboardShell><h1>Editor</h1></DashboardShell>);

    expect(screen.getByRole("main")).not.toHaveClass("dashboard-main--scroll-frame");
  });
});
