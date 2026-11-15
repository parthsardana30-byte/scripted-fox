import { NextResponse } from "next/server";

import { publicEnvironment } from "@/lib/env/public";
import { auth } from "@/lib/auth";
import { googleSignInCredentials, googleSignInErrorCallback } from "@/lib/auth/google-config";
import { safeInternalRedirect } from "@/lib/security/redirects";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const next = safeInternalRedirect(requestUrl.searchParams.get("next"));
  if (!googleSignInCredentials) {
    return NextResponse.redirect(new URL("/sign-in?error=oauth", publicEnvironment.NEXT_PUBLIC_SITE_URL));
  }
  try {
    const result = await auth.api.signInSocial({
      body: {
        provider: "google",
        callbackURL: next,
        errorCallbackURL: googleSignInErrorCallback(next),
      },
      headers: request.headers,
    });
    if (!result.url) throw new Error("Google login URL was not returned.");
    return NextResponse.redirect(result.url);
  } catch (error) {
    console.error("Google sign-in could not be started.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.redirect(new URL("/sign-in?error=oauth", publicEnvironment.NEXT_PUBLIC_SITE_URL));
  }
}
