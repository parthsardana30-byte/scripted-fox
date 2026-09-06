import "server-only";

export async function getLandingUser() {
  if (process.env.NODE_ENV === "development" && !process.env.DATABASE_URL) return null;
  const { getAuthenticatedUser } = await import("@/lib/auth/session");
  return getAuthenticatedUser();
}
