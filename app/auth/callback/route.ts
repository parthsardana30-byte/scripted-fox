import { NextResponse } from "next/server";

import { publicEnvironment } from "@/lib/env/public";
import { safeInternalRedirect } from "@/lib/security/redirects";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeInternalRedirect(requestUrl.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/sign-in?error=invalid_callback", publicEnvironment.NEXT_PUBLIC_SITE_URL));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/sign-in?error=auth_callback", publicEnvironment.NEXT_PUBLIC_SITE_URL));
  }

  return NextResponse.redirect(new URL(next, publicEnvironment.NEXT_PUBLIC_SITE_URL));
}
