import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("account deletion guarantees", () => {
  it("enables authenticated Better Auth deletion and revokes YouTube access first", () => {
    const authSource = readFileSync("lib/auth/index.ts", "utf8");
    expect(authSource).toContain("deleteUser: {");
    expect(authSource).toContain("enabled: true");
    expect(authSource).toContain("beforeDelete: async (user) => revokeConnectedYouTubeAccess(user.id)");
  });

  it("cascades every account-owned data table from the auth user", () => {
    const migration = readFileSync("db/migrations/001_app.sql", "utf8");
    const ownedTables = ["profiles", "user_preferences", "billing_accounts", "usage_events", "youtube_connections", "channel_snapshots", "video_metrics"];
    for (const table of ownedTables) {
      const block = migration.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\([\\s\\S]*?\\n\\);`, "i"))?.[0];
      expect(block, `${table} migration`).toContain('REFERENCES "user"(id) ON DELETE CASCADE');
    }
    expect(migration).toContain("connection_id uuid PRIMARY KEY REFERENCES youtube_connections(id) ON DELETE CASCADE");
  });
});
