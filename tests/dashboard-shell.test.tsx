import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard/ideas" }));

describe("DashboardShell", () => {
  it("marks the current page and can collapse the desktop navigation", async () => {
    const user = userEvent.setup();
    const { container } = render(<DashboardShell><h1>Ideas</h1></DashboardShell>);
    expect(screen.getByRole("link", { name: "Daily Topics" })).toHaveAttribute("aria-current", "page");
    await user.click(screen.getByRole("button", { name: "Collapse navigation" }));
    expect(container.firstChild).toHaveClass("dashboard-app--collapsed");
    expect(screen.getByRole("button", { name: "Expand navigation" })).toBeInTheDocument();
  });
});
