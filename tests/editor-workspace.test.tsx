import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EditorWorkspace } from "@/components/dashboard/editor-workspace";

const navigationMocks = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: navigationMocks.push }) }));

const revisedDraft = {
  title: "A sharper test video",
  sections: [
    { label: "Cold open", body: "Here is the stronger opening." },
    { label: "The test", body: "The revised explanation now lives in the editor." },
    { label: "Takeaway", body: "End on one clear takeaway." },
  ],
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
  navigationMocks.push.mockReset();
});

describe("EditorWorkspace", () => {
  it("prefills the assistant with the idea captured on the landing page", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    render(<EditorWorkspace initialPrompt="Compare five free editing tools on one short video" />);

    expect(screen.getByLabelText("Message the writing assistant")).toHaveValue(
      "Compare five free editing tools on one short video",
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/landing-intent",
      expect.objectContaining({ method: "DELETE" }),
    ));
  });

  it("loads a generated idea draft from the handoff", async () => {
    window.sessionStorage.setItem("next-video:draft", JSON.stringify(revisedDraft));
    render(<EditorWorkspace projectTitle="Untitled script" loadSessionDraft />);

    await waitFor(() => expect(screen.getByLabelText("Cold open script section")).toHaveValue("Here is the stronger opening."));
    expect(screen.getByRole("textbox", { name: "Script title" })).toHaveValue("A sharper test video");
  });

  it("starts without a hardcoded script and keeps typed text in place", async () => {
    const user = userEvent.setup();
    render(<EditorWorkspace projectTitle="My video" />);

    const hook = screen.getByLabelText("Script content");
    expect(hook).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Add smoother transitions" })).not.toBeInTheDocument();
    const title = screen.getByRole("textbox", { name: "Script title" });
    await user.clear(title);
    await user.type(title, "A title written on the page");
    expect(title).toHaveValue("A title written on the page");
    const author = screen.getByRole("textbox", { name: "Author name" });
    await user.type(author, "Aryan Atharv");
    expect(author).toHaveValue("Aryan Atharv");
    expect(screen.getByText("0 words")).toBeVisible();
    await user.type(hook, "A creator-written opening");
    expect(hook).toHaveValue("A creator-written opening");
    expect(screen.queryByRole("tablist", { name: "Editor view" })).not.toBeInTheDocument();
  });

  it("routes free users to upgrade when they request an advanced export", async () => {
    const user = userEvent.setup();
    render(<EditorWorkspace />);

    await user.click(screen.getByRole("button", { name: /Export/ }));

    expect(screen.getByRole("menuitem", { name: /PDF Upgrade/ })).toHaveAttribute(
      "href",
      "/dashboard/upgrade?feature=advanced_exports",
    );
    expect(screen.getByRole("menuitem", { name: /Word document Upgrade/ })).toHaveAttribute(
      "href",
      "/dashboard/upgrade?feature=advanced_exports",
    );
  });

  it("downloads a professional PDF for plans with advanced exports", async () => {
    const user = userEvent.setup();
    const createObjectUrl = vi.fn(() => "blob:script-pdf");
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectUrl });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectUrl });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-disposition": 'attachment; filename="pencils-to-pixels.pdf"' }),
      blob: async () => new Blob(["pdf"], { type: "application/pdf" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<EditorWorkspace canUseAdvancedExports projectTitle="Pencils to Pixels" />);

    await user.type(screen.getByLabelText("Script content"), "A complete creator script.");
    await user.type(screen.getByLabelText("Author name"), "Aryan Atharv");
    await user.click(screen.getByRole("button", { name: /Export/ }));
    await user.click(screen.getByRole("menuitem", { name: /PDF/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/export/pdf", expect.objectContaining({ method: "POST" })));
    expect(createObjectUrl).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
  });

  it("asks for a topic instead of inventing a script when an empty draft receives an editing command", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<EditorWorkspace />);

    await user.type(screen.getByLabelText("Message the writing assistant"), "Add smoother transitions");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText(/There isn’t a script to edit yet/)).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Script content")).toHaveValue("");
  });

  it("uses an idea-first prompt only while the script is empty", async () => {
    const user = userEvent.setup();
    render(<EditorWorkspace />);

    const assistantInput = screen.getByLabelText("Message the writing assistant");
    expect(assistantInput).toHaveAttribute("placeholder", "Describe your idea…");
    expect(screen.queryByRole("button", { name: "Write a full script" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Close AI assistant" })).toHaveLength(1);

    await user.type(screen.getByLabelText("Script content"), "A script is now present");
    expect(assistantInput).toHaveAttribute("placeholder", "Ask for a change to your script…");
  });

  it("opens pricing without calling AI when script writing is not included", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<EditorWorkspace canUseScriptWriter={false} returnPath="/dashboard/editor/new-script" />);

    await user.type(screen.getByLabelText("Message the writing assistant"), "Write a video about testing free editing tools");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(navigationMocks.push).toHaveBeenCalledWith(
      "/pricing?feature=ai_script_writer&next=%2Fdashboard%2Feditor%2Fnew-script",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("can start an untitled draft when the prompt supplies a specific topic", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ draft: revisedDraft }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<EditorWorkspace />);

    await user.type(screen.getByLabelText("Message the writing assistant"), "Write a video about testing free editing tools");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => expect(screen.getByLabelText("Cold open script section")).toHaveValue("Here is the stronger opening."));
    expect(fetchMock).toHaveBeenCalledWith("/api/ai/script", expect.objectContaining({ method: "POST" }));
  });

  it("keeps the current script unchanged when AI returns an incomplete draft", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ draft: { title: "Broken response" } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<EditorWorkspace projectTitle="Editing tools comparison" />);

    await user.type(screen.getByLabelText("Script content"), "Keep this opening");
    await user.type(screen.getByLabelText("Message the writing assistant"), "Make the opening stronger");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText(/AI response was incomplete/)).toBeVisible();
    expect(screen.getByLabelText("Script content")).toHaveValue("Keep this opening");
  });

  it("does not overwrite typing that happens while an AI edit is running", async () => {
    const user = userEvent.setup();
    let finishRequest!: (value: { ok: boolean; json: () => Promise<{ draft: typeof revisedDraft; message: string }> }) => void;
    const fetchMock = vi.fn().mockImplementation(() => new Promise((resolve) => { finishRequest = resolve; }));
    vi.stubGlobal("fetch", fetchMock);
    render(<EditorWorkspace projectTitle="Editing tools comparison" />);

    const hook = screen.getByLabelText("Script content");
    await user.type(hook, "Original opening");
    await user.type(screen.getByLabelText("Message the writing assistant"), "Make the opening stronger");
    await user.click(screen.getByRole("button", { name: "Send message" }));
    await user.type(hook, " with a newer detail");

    finishRequest({
      ok: true,
      json: async () => ({ draft: revisedDraft, message: "Done — I changed the opening." }),
    });

    expect(await screen.findByText(/didn’t overwrite your newer text/)).toBeVisible();
    expect(hook).toHaveValue("Original opening with a newer detail");
  });

  it("applies the assistant response directly to the script", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ draft: revisedDraft, message: "Done — I tightened the opening." }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<EditorWorkspace projectTitle="My video" />);

    await user.type(screen.getByLabelText("Script content"), "A rough opening");
    expect(screen.getByRole("complementary", { name: "AI writing assistant" })).toBeVisible();
    await user.type(screen.getByLabelText("Message the writing assistant"), "Make the opening stronger");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => expect(screen.getByLabelText("Cold open script section")).toHaveValue("Here is the stronger opening."));
    expect(screen.getByText("Done — I tightened the opening.")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith("/api/ai/script", expect.objectContaining({ method: "POST" }));
  });

  it("creates a version for an AI change and restores an older version without losing history", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ draft: revisedDraft, message: "Done — I rewrote the script." }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<EditorWorkspace projectTitle="Version test" projectKey="version-test" versionChangeLimit={10} />);

    const script = screen.getByLabelText("Script content");
    await user.type(script, "Keep this original version");
    await user.type(screen.getByLabelText("Message the writing assistant"), "Rewrite the script");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => expect(screen.getByRole("button", { name: /Version 2/ })).toBeVisible());
    await user.click(screen.getByRole("button", { name: /Version 2/ }));
    expect(screen.getByRole("menu", { name: "Version history" })).toBeVisible();
    await user.click(screen.getByRole("menuitem", { name: /Version 1/ }));

    expect(screen.getByLabelText("Script content")).toHaveValue("Keep this original version");
    expect(screen.getByRole("button", { name: /Version 3/ })).toBeVisible();
  });

  it("stops AI version changes when the plan limit is reached", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ draft: revisedDraft, message: "Done." }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<EditorWorkspace projectTitle="Limit test" projectKey="limit-test" versionChangeLimit={1} />);

    await user.type(screen.getByLabelText("Script content"), "First version");
    await user.type(screen.getByLabelText("Message the writing assistant"), "Rewrite this once");
    await user.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await user.type(screen.getByLabelText("Message the writing assistant"), "Rewrite this again");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/used the 1 version change/)).toBeVisible();
  });
});
