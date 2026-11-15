import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { publicEnvironment } from "@/lib/env/public";
import { googleSignInCredentials } from "@/lib/auth/google-config";

export async function GET(request: Request) {
  if (!googleSignInCredentials) {
    return NextResponse.redirect(new URL("/dashboard/account?google=unavailable", publicEnvironment.NEXT_PUBLIC_SITE_URL));
  }

  try {
    const result = await auth.api.linkSocialAccount({
      body: {
        provider: "google",
        callbackURL: "/dashboard/account?google=linked",
        errorCallbackURL: "/dashboard/account?google=error",
      },
      headers: request.headers,
    });
    return NextResponse.redirect(result.url);
  } catch (error) {
    console.error("Google account linking could not be started.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.redirect(new URL("/dashboard/account?google=error", publicEnvironment.NEXT_PUBLIC_SITE_URL));
  }
}
