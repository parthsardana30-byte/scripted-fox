import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NicheConfirmationDialog } from "@/components/dashboard/niche-confirmation-dialog";

vi.mock("@/app/dashboard/actions", () => ({
  confirmYouTubeNiche: vi.fn(),
}));

afterEach(cleanup);

describe("NicheConfirmationDialog", () => {
  it("shows the inferred niche as a controlled, selected choice", () => {
    render(
      <NicheConfirmationDialog
        channelName="Aryan Keys"
        suggestedNiche="Piano covers"
      />,
    );

    expect(screen.getByRole("dialog", { name: "Choose your channel niche" })).toBeVisible();
    expect(screen.getByText("Selected niche").parentElement).toHaveTextContent("Piano Covers");
    expect(screen.getByRole("button", { name: "Piano Covers" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Confirm niche" })).toBeEnabled();
  });

  it("reorders matching pills as the creator searches and updates the selection", async () => {
    const user = userEvent.setup();
    render(<NicheConfirmationDialog channelName="Aryan Keys" suggestedNiche="Piano covers" />);

    await user.type(screen.getByRole("searchbox", { name: "Find another niche" }), "mu");
    const choices = screen.getByRole("group", { name: "Niche choices" });
    await waitFor(() => {
      const labels = within(choices).getAllByRole("button").map((button) => button.textContent);
      expect(labels.slice(0, 4)).toEqual(["Music", "Music Reviews", "Music Production", "Musical Instruments"]);
    });

    await user.click(screen.getByRole("button", { name: "Music Production" }));
    expect(screen.getByText("Selected niche").parentElement).toHaveTextContent("Music Production");
    expect(screen.getByRole("button", { name: "Confirm niche" })).toBeEnabled();
  });
});
