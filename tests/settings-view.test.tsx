import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SettingsView } from "@/components/dashboard/settings-view";

vi.mock("@/app/dashboard/settings/actions", () => ({
  saveSettings: vi.fn(async () => ({ status: "success", message: "Preferences saved." })),
}));

describe("SettingsView", () => {
  it("shows and restores the creator, script, export, and editor preferences", () => {
    render(<SettingsView initialValues={{
      language: "hi",
      secondaryLanguage: "en",
      market: "IN",
      tone: "educational",
      videoLength: "10-15",
      detailLevel: "detailed",
      openingStyle: "story",
      exportFormat: "docx",
      includeTitle: true,
      openAssistant: false,
    }} />);

    expect(screen.getByLabelText("Primary language")).toHaveValue("hi");
    expect(screen.getByLabelText("Secondary language")).toHaveValue("en");
    expect(screen.getByLabelText("Outline detail")).toHaveValue("detailed");
    expect(screen.getByLabelText("Default opening")).toHaveValue("story");
    expect(screen.getByLabelText("Default export format")).toHaveValue("docx");
    expect(screen.getByLabelText(/^Include script title/)).toBeChecked();
    expect(screen.getByLabelText(/^Open AI assistant with the editor/)).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Save all settings" })).toBeEnabled();
  });
});
