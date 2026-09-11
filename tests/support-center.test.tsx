import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { SupportCenter } from "@/components/support/support-center";

beforeAll(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("SupportCenter", () => {
  it("opens the linked YouTube recovery question inside the Account category", () => {
    render(<SupportCenter initialCategory="account" initialFaq="youtube-channel-in-use" />);

    expect(screen.getByRole("button", { name: /My YouTube channel is connected to another account/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Chat with us" })).toBeVisible();
  });

  it("searches across categories and only exposes chat for priority answers", async () => {
    const user = userEvent.setup();
    render(<SupportCenter />);

    await user.type(screen.getByRole("searchbox", { name: "Search help" }), "YouTube analytics");
    expect(screen.getByRole("button", { name: /My YouTube analytics are not updating/ })).toBeVisible();
    expect(screen.queryByRole("button", { name: /How do I cancel my subscription/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /My YouTube analytics are not updating/ }));
    expect(screen.queryByRole("button", { name: "Chat with us" })).not.toBeInTheDocument();
  });

  it("creates an active conversation and pins it in conversation history", async () => {
    const user = userEvent.setup();
    render(<SupportCenter initialCategory="account" initialFaq="youtube-channel-in-use" />);

    await user.click(screen.getByRole("button", { name: "Chat with us" }));
    expect(screen.getByText(/I can help with/)).toBeVisible();
    await user.click(screen.getAllByRole("button", { name: "Close conversation" })[0]);
    await user.click(screen.getByRole("tab", { name: /Conversations/ }));

    const history = screen.getByRole("region", { name: "Your support threads" });
    const firstThread = within(history).getAllByRole("button")[0];
    expect(firstThread).toHaveTextContent("My YouTube channel is connected to another account");
    expect(firstThread).toHaveTextContent("Active");
  });
});
