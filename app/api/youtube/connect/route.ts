import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/session";
import { publicEnvironment } from "@/lib/env/public";
import { createYouTubeAuthorizationUrl } from "@/lib/youtube/google";

export const runtime = "nodejs";

const OAUTH_COOKIE_MAX_AGE = 10 * 60;

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.redirect(new URL("/sign-in?next=/connect", publicEnvironment.NEXT_PUBLIC_SITE_URL));

  try {
    const state = randomBytes(32).toString("base64url");
    const codeVerifier = randomBytes(48).toString("base64url");
    const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
    const authorizationUrl = createYouTubeAuthorizationUrl(state, codeChallenge);
    const response = NextResponse.redirect(authorizationUrl);
    const cookieOptions = {
      httpOnly: true,
      maxAge: OAUTH_COOKIE_MAX_AGE,
      path: "/api/youtube/callback",
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
    };

    response.cookies.set("youtube_oauth_state", JSON.stringify({ state, userId: user.id }), cookieOptions);
    response.cookies.set("youtube_oauth_verifier", codeVerifier, cookieOptions);
    return response;
  } catch {
    return NextResponse.redirect(new URL("/connect?error=not_configured", publicEnvironment.NEXT_PUBLIC_SITE_URL));
  }
}
