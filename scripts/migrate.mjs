import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import nextEnvironment from "@next/env";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import pg from "pg";

const { loadEnvConfig } = nextEnvironment;
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const { Pool } = pg;
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Use the Supabase Postgres connection string from Project Settings > Database.");
}
if (!process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length < 32) {
  throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const migrationAuth = betterAuth({
    database: pool,
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    emailAndPassword: { enabled: true },
    telemetry: { enabled: false },
  });
  const { runMigrations } = await getMigrations(migrationAuth.options);
  await runMigrations();

  const migrationDirectory = path.join(process.cwd(), "db", "migrations");
  const files = (await readdir(migrationDirectory)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    await pool.query(await readFile(path.join(migrationDirectory, file), "utf8"));
  }
  console.log("Database migrations completed.");
} finally {
  await pool.end();
}
