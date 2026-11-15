import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IdeasView } from "@/components/dashboard/ideas-view";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/lib/dashboard-services", () => ({
  dashboardService: {
    getMoreIdeas: vi.fn().mockResolvedValue([]),
  },
}));

const generatedDraft = {
  title: "Selected idea",
  sections: [
    { label: "Before the test", body: "A generated opening." },
    { label: "What happened", body: "A generated explanation." },
    { label: "What I learned", body: "A generated conclusion." },
  ],
};

describe("IdeasView", () => {
  it("shows the server failure instead of silently asking for another scan", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "The AI service has reached its usage limit." }) }));
    render(<IdeasView />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Refresh topics" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("usage limit");
    expect(screen.getByRole("button", { name: "Refresh topics" })).toBeEnabled();
  });

  it("disables refresh while generation is pending", async () => {
    let finish: (value: unknown) => void = () => {};
    const pending = new Promise((resolve) => { finish = resolve; });
    const fetcher = vi.fn().mockReturnValue(pending);
    vi.stubGlobal("fetch", fetcher);
    render(<IdeasView />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Refresh topics" }));
    expect(screen.getByRole("button", { name: "Refreshing topics" })).toBeDisabled();
    expect(fetcher).toHaveBeenCalledTimes(1);
    finish({ ok: false, json: async () => ({ error: "Please try later." }) });
    await screen.findByRole("alert");
  });
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("saves without adding navigation and restores a dismissed idea", async () => {
    const user = userEvent.setup();
    render(<IdeasView />);
    const firstIdea = screen.getByRole("heading", { name: "Edit a YouTube video in half the time" }).closest("article");
    expect(firstIdea).not.toBeNull();
    await user.click(within(firstIdea!).getByRole("button", { name: "Save for later" }));
    await user.click(screen.getByRole("tab", { name: "Saved" }));
    expect(screen.getByRole("heading", { name: "Edit a YouTube video in half the time" })).toBeVisible();
    await user.click(within(firstIdea!).getByRole("button", { name: "Not interested" }));
    expect(screen.getByRole("status")).toHaveTextContent("removed");
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByRole("heading", { name: "Edit a YouTube video in half the time" })).toBeVisible();
  });

  it("shows the generation state only on the selected idea", async () => {
    const user = userEvent.setup();
    let finishGeneration: (() => void) | undefined;
    const generation = new Promise((resolve) => {
      finishGeneration = () => resolve({ ok: true, json: async () => ({ draft: generatedDraft }) });
    });
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => generation)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ projectId: "saved-project" }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<IdeasView />);

    const firstIdea = screen.getByRole("heading", { name: "Edit a YouTube video in half the time" }).closest("article");
    const secondIdea = screen.getByRole("heading", { name: "Turn one Short into a useful long-form video" }).closest("article");
    await user.click(within(firstIdea!).getByRole("button", { name: "Generate script" }));

    expect(within(firstIdea!).getByRole("button", { name: "Preparing…" })).toBeDisabled();
    expect(within(secondIdea!).getByRole("button", { name: "Generate script" })).toBeEnabled();

    finishGeneration?.();
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/dashboard/editor/saved-project"));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/projects", expect.objectContaining({ method: "POST" }));
    expect(window.sessionStorage.getItem("next-video:draft")).toBeNull();
  });

  it("opens pricing instead of calling AI when script writing is not included", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<IdeasView canUseScriptWriter={false} />);

    await user.click(screen.getAllByRole("button", { name: "Generate script" })[0]!);

    expect(mocks.push).toHaveBeenCalledWith(
      "/pricing?feature=ai_script_writer&next=%2Fdashboard%2Fideas",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
