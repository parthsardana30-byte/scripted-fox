import { NextResponse } from "next/server";

import { publicEnvironment } from "@/lib/env/public";
import { safeInternalRedirect } from "@/lib/security/redirects";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const next = safeInternalRedirect(requestUrl.searchParams.get("next"));
  return NextResponse.redirect(new URL(`/sign-in?next=${encodeURIComponent(next)}`, publicEnvironment.NEXT_PUBLIC_SITE_URL));
}
