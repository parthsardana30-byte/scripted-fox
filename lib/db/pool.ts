import "server-only";

import { Pool } from "pg";

import { serverEnvironment } from "@/lib/env/server";

const globalDatabase = globalThis as typeof globalThis & { scriptedFoxPool?: Pool };

export const databasePool = globalDatabase.scriptedFoxPool ?? new Pool({
  connectionString: serverEnvironment.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
});

if (process.env.NODE_ENV !== "production") globalDatabase.scriptedFoxPool = databasePool;
