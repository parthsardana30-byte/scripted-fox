import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const migrationAuth = betterAuth({
    database: pool,
    secret: process.env.BETTER_AUTH_SECRET,
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
