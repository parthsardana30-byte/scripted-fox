import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { safeInternalRedirect } from "@/lib/security/redirects";
import { signupErrorMessage } from "@/lib/auth/errors";
import { publicEnvironmentSchema, serverEnvironmentSchema } from "@/lib/env/schema";

const migrationPath = resolve(process.cwd(), "supabase/migrations/20260821100000_initial_backend.sql");
const migration = readFileSync(migrationPath, "utf8");

describe("backend security foundation", () => {
  it("accepts only internal redirect paths", () => {
    expect(safeInternalRedirect("/dashboard/editor?draft=1")).toBe("/dashboard/editor?draft=1");
    expect(safeInternalRedirect("https://attacker.example/path")).toBe("/dashboard");
    expect(safeInternalRedirect("//attacker.example/path")).toBe("/dashboard");
    expect(safeInternalRedirect("javascript:alert(1)")).toBe("/dashboard");
  });

  it("enables RLS on every exposed application table", () => {
    const exposedTables = [
      "profiles", "user_preferences", "usage_events", "youtube_connections",
      "channel_snapshots", "video_metrics", "creator_profiles", "trend_snapshots",
      "sync_runs", "ideas", "idea_evidence", "projects", "video_plans", "scripts",
      "script_sections", "script_versions", "recording_notes", "exports",
    ];

    exposedTables.forEach((table) => {
      expect(migration).toContain(`alter table public.${table} enable row level security;`);
    });
  });

  it("keeps YouTube credentials outside the exposed public schema", () => {
    expect(migration).toContain("create table private.youtube_credentials");
    expect(migration).toContain("revoke all on table private.youtube_credentials from public, anon, authenticated;");
    expect(migration).not.toContain("public.youtube_credentials");
  });

  it("enforces matching ownership across parent-child records", () => {
    expect(migration).toContain("foreign key (project_id, user_id) references public.projects(id, user_id)");
    expect(migration).toContain("foreign key (script_id, user_id) references public.scripts(id, user_id)");
    expect(migration).toContain("foreign key (connection_id, user_id) references public.youtube_connections(id, user_id)");
  });
});

describe("signup error messages", () => {
  it("explains restricted default SMTP recipients", () => {
    expect(signupErrorMessage({ code: "email_address_not_authorized", status: 400 })).toContain("custom SMTP");
  });

  it("does not expose unknown provider details", () => {
    expect(signupErrorMessage({ code: "unexpected_failure", status: 500 })).toBe(
      "We could not create your account right now. Please try again shortly.",
    );
  });
});

describe("deployment environment safety", () => {
  it("rejects localhost as a production site URL", () => {
    const result = publicEnvironmentSchema.safeParse({
      NEXT_PUBLIC_DEPLOYMENT_ENV: "production",
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a localhost YouTube callback in production", () => {
    const result = serverEnvironmentSchema.safeParse({
      NEXT_PUBLIC_DEPLOYMENT_ENV: "production",
      SUPABASE_SECRET_KEY: "sb_secret_test",
      SUPABASE_DB_URL: "postgresql://example",
      GOOGLE_YOUTUBE_REDIRECT_URI: "http://localhost:3000/api/youtube/callback",
    });

    expect(result.success).toBe(false);
  });

  it("allows Fox AI to be absent but rejects partial production configuration", () => {
    const base = {
      NEXT_PUBLIC_DEPLOYMENT_ENV: "production",
      DATABASE_URL: "postgresql://example",
      BETTER_AUTH_SECRET: "a-production-secret-that-is-long-enough",
    };

    expect(serverEnvironmentSchema.safeParse(base).success).toBe(true);
    expect(serverEnvironmentSchema.safeParse({ ...base, FOX_AI_API_URL: "https://ai.example/chat" }).success).toBe(false);
    expect(serverEnvironmentSchema.safeParse({
      ...base,
      FOX_AI_API_URL: "https://ai.example/chat",
      FOX_AI_API_KEY: "secret",
      FOX_AI_MODEL: "support-model",
      FOX_AI_SUPPORT_EMAIL: "support@example.com",
    }).success).toBe(true);
  });
});
