import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PricingCatalogue } from "@/components/billing/pricing-catalogue";

describe("PricingCatalogue", () => {
  it("keeps savings copy outside the two-option billing switch", async () => {
    const user = userEvent.setup();
    render(<PricingCatalogue />);

    const period = screen.getByRole("group", { name: "Billing period" });
    expect(within(period).getAllByRole("button")).toHaveLength(2);
    expect(within(period).getByRole("button", { name: "Monthly" })).toHaveAttribute("aria-pressed", "true");
    expect(within(period).getByRole("button", { name: "Annually" })).toHaveAttribute("aria-pressed", "false");
    expect(within(period).queryByText(/Save 20%/)).not.toBeInTheDocument();
    expect(screen.getByText("Save 20%")).toBeVisible();

    await user.click(within(period).getByRole("button", { name: "Annually" }));

    expect(within(period).getByRole("button", { name: "Annually" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("₹40")).toBeVisible();
    expect(screen.getByText("₹120")).toBeVisible();
  });
});
