import "server-only";

import { cache } from "react";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { databasePool } from "@/lib/db/pool";

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication required");
    this.name = "AuthenticationRequiredError";
  }
}

export const getAuthenticatedUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const providers = await databasePool.query(
    `SELECT "providerId" FROM account WHERE "userId" = $1`,
    [session.user.id],
  );
  return {
    id: session.user.id,
    email: session.user.email,
    created_at: session.user.createdAt.toISOString(),
    user_metadata: {
      full_name: session.user.name,
      name: session.user.name,
      avatar_url: session.user.image,
    },
    app_metadata: { providers: providers.rows.map((row) => row.providerId) },
  };
});

export async function requireAuthenticatedUser() {
  const user = await getAuthenticatedUser();
  if (!user) throw new AuthenticationRequiredError();
  return user;
}
