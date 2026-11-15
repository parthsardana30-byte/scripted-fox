import { describe, expect, it } from "vitest";

import { projectSaveSchema } from "@/lib/projects/types";

const createdAt = "2026-09-24T12:00:00.000Z";

describe("project persistence payload", () => {
  it("accepts a blank first draft so a new script can autosave immediately", () => {
    const document = {
      title: "Untitled script",
      author: "",
      draft: { title: "Untitled script", sections: [{ label: "Script", body: "" }] },
    };
    expect(projectSaveSchema.safeParse({
      document,
      versions: [{ number: 1, label: "Initial draft", origin: "initial", createdAt, snapshot: document }],
    }).success).toBe(true);
  });

  it("rejects invalid project identifiers and timestamps", () => {
    const document = {
      title: "A script",
      author: "Creator",
      draft: { title: "A script", sections: [{ label: "Script", body: "Opening" }] },
    };
    expect(projectSaveSchema.safeParse({
      projectId: "not-a-uuid",
      document,
      versions: [{ number: 1, label: "Initial draft", origin: "initial", createdAt: "yesterday", snapshot: document }],
    }).success).toBe(false);
  });
});
