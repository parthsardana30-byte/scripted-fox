import { NextResponse } from "next/server";

import { publicEnvironment } from "@/lib/env/public";
import { serverEnvironment } from "@/lib/env/server";
import { auth } from "@/lib/auth";
import { safeInternalRedirect } from "@/lib/security/redirects";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const next = safeInternalRedirect(requestUrl.searchParams.get("next"));
  if (!serverEnvironment.GOOGLE_AUTH_CLIENT_ID || !serverEnvironment.GOOGLE_AUTH_CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/sign-in?error=oauth", publicEnvironment.NEXT_PUBLIC_SITE_URL));
  }
  try {
    const result = await auth.api.signInSocial({
      body: { provider: "google", callbackURL: next },
      headers: request.headers,
    });
    if (!result.url) throw new Error("Google login URL was not returned.");
    return NextResponse.redirect(result.url);
  } catch {
    return NextResponse.redirect(new URL("/sign-in?error=oauth", publicEnvironment.NEXT_PUBLIC_SITE_URL));
  }
}
