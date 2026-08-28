import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DashboardLoading } from "@/components/dashboard/dashboard-loading";

describe("DashboardLoading", () => {
  it("announces that destination content is loading", () => {
    render(<DashboardLoading />);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Opening your workspace")).toBeVisible();
    expect(screen.getByText("Getting this page ready.")).toBeVisible();
  });
});
