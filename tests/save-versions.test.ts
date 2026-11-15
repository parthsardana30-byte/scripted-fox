// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { replaceScriptVersions } from "@/lib/projects/save-versions";
import { projectSaveSchema } from "@/lib/projects/types";
const document = { title: "My script", author: "", draft: { title: "My script", sections: [{ label: "Script", body: "" }] } };
const version = { number: 1, label: "Initial", origin: "initial" as const, createdAt: "2026-10-05T00:00:00.000Z", snapshot: document };

describe("script version saves", () => {
  it.each([1, 10, 100])("saves %i versions with two queries, not one query per version", async (count) => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const versions = Array.from({ length: count }, (_, index) => ({ ...version, number: index + 1 }));
    await replaceScriptVersions({ query }, "owner", "script", versions);
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0][1]).toEqual(["script", "owner"]);
    expect(query.mock.calls[1][0]).toContain("jsonb_to_recordset");
    expect(JSON.parse(query.mock.calls[1][1][2])).toEqual(versions);
  });
  it("rejects duplicate and out-of-order versions before reaching the database", () => {
    for (const numbers of [[1, 1], [2, 1]]) {
      expect(projectSaveSchema.safeParse({ document, versions: numbers.map(number => ({ ...version, number })) }).success).toBe(false);
    }
    expect(projectSaveSchema.safeParse({ document, versions: [version, { ...version, number: 3 }] }).success).toBe(true);
  });
});
