import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { publicEnvironment } from "@/lib/env/public";
import { serverEnvironment } from "@/lib/env/server";

export async function GET(request: Request) {
  if (!serverEnvironment.GOOGLE_AUTH_CLIENT_ID || !serverEnvironment.GOOGLE_AUTH_CLIENT_SECRET) {
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
  } catch {
    return NextResponse.redirect(new URL("/dashboard/account?google=error", publicEnvironment.NEXT_PUBLIC_SITE_URL));
  }
}
