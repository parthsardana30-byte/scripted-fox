import { describe, expect, it } from "vitest";

import { maskEmailAddress, maskedAccountHint, maskPhoneNumber } from "@/lib/auth/account-hint";

describe("account identifier masking", () => {
  it("keeps only a small email reminder visible", () => {
    expect(maskEmailAddress("aryanatharv3@gmail.com")).toBe("ar••••••3@gmail.com");
  });

  it("uses a fixed mask for phone numbers", () => {
    expect(maskPhoneNumber("+91 98765 43200")).toBe("91 •••••• 00");
  });

  it("does not expose malformed identifiers", () => {
    expect(maskedAccountHint({ email: "not-an-email" })).toBe("another Scripted Fox account");
  });
});
