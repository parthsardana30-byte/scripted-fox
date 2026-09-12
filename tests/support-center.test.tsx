import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FoxAiChat } from "@/components/support/fox-ai-chat";
import { SupportCenter } from "@/components/support/support-center";

vi.mock("next/navigation", () => ({ usePathname: () => "/help" }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("SupportCenter", () => {
  it("renders all four FAQ categories and the complete short-answer knowledge", async () => {
    const user = userEvent.setup();
    render(<SupportCenter />);

    expect(screen.getByText("Using Scripted Fox")).toBeVisible();
    expect(screen.getByText("Login and YouTube")).toBeVisible();
    expect(screen.getByText("Plans and payments")).toBeVisible();
    expect(screen.getByText("Errors and exports")).toBeVisible();
    expect(screen.getByText("14 answers")).toBeVisible();

    await user.click(screen.getByRole("button", { name: /AccountLogin and YouTube/ }));
    expect(screen.getByText("11 answers")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "How do I reset my password?" }));
    expect(screen.getByText(/Use the password recovery option/)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /BillingPlans and payments/ }));
    expect(screen.getByText("9 answers")).toBeVisible();
    await user.click(screen.getByRole("button", { name: /TechnicalErrors and exports/ }));
    expect(screen.getByText("11 answers")).toBeVisible();
  });

  it("preserves linked FAQ behavior and removes hardcoded chat buttons", () => {
    render(<SupportCenter initialCategory="account" initialFaq="youtube-channel-in-use" />);

    expect(screen.getByRole("button", { name: "How do I switch my YouTube channel?" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByRole("button", { name: "Chat with us" })).not.toBeInTheDocument();
  });

  it("keeps the Fox AI launcher available on the FAQ page", () => {
    render(<><SupportCenter /><FoxAiChat /></>);
    expect(screen.getByRole("button", { name: "Open Fox AI support" })).toBeVisible();
  });
});

describe("FoxAiChat", () => {
  it("sends conversation context and renders a real provider response", async () => {
    const user = userEvent.setup();
    let resolveFetch!: (value: { ok: true; json: () => Promise<{ message: string }> }) => void;
    const fetchMock = vi.fn().mockReturnValue(new Promise((resolve) => { resolveFetch = resolve; }));
    vi.stubGlobal("fetch", fetchMock);
    render(<FoxAiChat />);

    await user.click(screen.getByRole("button", { name: "Open Fox AI support" }));
    await user.type(screen.getByRole("textbox", { name: "Ask Fox AI" }), "Why is YouTube not syncing?");
    await user.click(screen.getByRole("button", { name: "Send to Fox AI" }));
    expect(screen.getByLabelText("Fox AI is typing")).toBeVisible();
    resolveFetch({ ok: true, json: async () => ({ message: "Open Account, then reconnect YouTube." }) });

    expect(await screen.findByText("Open Account, then reconnect YouTube.")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith("/api/fox-ai/chat", expect.objectContaining({ method: "POST" }));
  });

  it("shows an error and retries the same conversation", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Fox AI is temporarily unavailable." }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: "The retry worked." }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<FoxAiChat />);

    await user.click(screen.getByRole("button", { name: "Open Fox AI support" }));
    await user.type(screen.getByRole("textbox", { name: "Ask Fox AI" }), "Help with an export error");
    await user.click(screen.getByRole("button", { name: "Send to Fox AI" }));
    await user.click(await screen.findByRole("button", { name: "Retry" }));

    expect(await screen.findByText("The retry worked.")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
