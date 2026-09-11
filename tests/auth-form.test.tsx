import { describe, expect, it } from "vitest";

import { oauthErrorMessage } from "@/lib/auth/oauth-errors";

describe("AuthForm OAuth errors", () => {
  it("explains how an existing password account can securely link Google", () => {
    expect(oauthErrorMessage("account_not_linked")).toContain(
      "Sign in with your password, then connect Google from Account settings.",
    );
  });

  it("does not expose an unknown provider error", () => {
    expect(oauthErrorMessage("unexpected_provider_error")).toBe(
      "Google sign-in was not completed. Please try again.",
    );
  });
});
