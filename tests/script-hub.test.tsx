import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ScriptHub } from "@/components/dashboard/script-hub";

vi.mock("@/app/dashboard/editor/actions", () => ({
  saveScriptHubSetup: vi.fn(async () => ({ status: "success" })),
}));

afterEach(cleanup);

describe("ScriptHub", () => {
  it("opens Get a script on the Recommendations page", () => {
    render(<ScriptHub
      initialSetupComplete
      initialValues={{ language: "en", market: "IN", tone: "clear", videoLength: "7-10", detailLevel: "balanced", openingStyle: "hook", format: "youtube" }}
      initialPrompt=""
      canUseAdvancedExports={false}
      canUseScriptWriter
      versionChangeLimit={1}
    />);

    expect(screen.getByRole("link", { name: /Get a script/ })).toHaveAttribute("href", "/dashboard/ideas");
  });
});
