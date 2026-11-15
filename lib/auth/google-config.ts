import "server-only";

import { publicEnvironment } from "@/lib/env/public";
import { serverEnvironment } from "@/lib/env/server";

export const googleSignInCredentials =
  serverEnvironment.GOOGLE_AUTH_CLIENT_ID && serverEnvironment.GOOGLE_AUTH_CLIENT_SECRET
    ? {
        clientId: serverEnvironment.GOOGLE_AUTH_CLIENT_ID,
        clientSecret: serverEnvironment.GOOGLE_AUTH_CLIENT_SECRET,
      }
    : null;

export const googleSignInCallbackUrl = new URL(
  "/api/auth/callback/google",
  publicEnvironment.NEXT_PUBLIC_SITE_URL,
).toString();

export function googleSignInErrorCallback(nextPath: string) {
  const callback = new URL("/sign-in", publicEnvironment.NEXT_PUBLIC_SITE_URL);
  callback.searchParams.set("next", nextPath);
  return `${callback.pathname}${callback.search}`;
}
