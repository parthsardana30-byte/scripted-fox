import { NextResponse } from "next/server";

import { publicEnvironment } from "@/lib/env/public";
import { safeInternalRedirect } from "@/lib/security/redirects";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const next = safeInternalRedirect(requestUrl.searchParams.get("next"));
  const callbackUrl = new URL(
    `/auth/callback?next=${encodeURIComponent(next)}`,
    publicEnvironment.NEXT_PUBLIC_SITE_URL,
  ).toString();

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl },
  });

  if (error || !data.url) {
    return NextResponse.redirect(new URL("/sign-in?error=oauth", publicEnvironment.NEXT_PUBLIC_SITE_URL));
  }

  return NextResponse.redirect(data.url);
}
