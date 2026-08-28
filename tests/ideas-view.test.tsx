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
    const fetchMock = vi.fn().mockReturnValue(new Promise((resolve) => {
      finishGeneration = () => resolve({ ok: true, json: async () => ({ draft: generatedDraft }) });
    }));
    vi.stubGlobal("fetch", fetchMock);
    render(<IdeasView />);

    const firstIdea = screen.getByRole("heading", { name: "Edit a YouTube video in half the time" }).closest("article");
    const secondIdea = screen.getByRole("heading", { name: "Turn one Short into a useful long-form video" }).closest("article");
    await user.click(within(firstIdea!).getByRole("button", { name: "Generate script" }));

    expect(within(firstIdea!).getByRole("button", { name: "Preparing…" })).toBeDisabled();
    expect(within(secondIdea!).getByRole("button", { name: "Generate script" })).toBeEnabled();

    finishGeneration?.();
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/dashboard/editor/new-script"));
    expect(JSON.parse(window.sessionStorage.getItem("next-video:draft") ?? "null")).toEqual(generatedDraft);
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
