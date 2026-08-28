import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SiteHeader } from "@/components/landing/site-header";

afterEach(cleanup);

describe("SiteHeader authentication state", () => {
  it("shows sign-in and dashboard-bound signup actions to visitors", () => {
    render(<SiteHeader variant="creator" />);

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
    expect(screen.getByRole("link", { name: "Start planning" })).toHaveAttribute("href", "/sign-up?next=/dashboard");
    expect(screen.queryByRole("link", { name: "Go to dashboard" })).not.toBeInTheDocument();
  });

  it("replaces authentication actions with one dashboard action for signed-in users", () => {
    render(<SiteHeader variant="creator" isAuthenticated />);

    expect(screen.getByRole("link", { name: "Go to dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Start planning" })).not.toBeInTheDocument();
  });
});
