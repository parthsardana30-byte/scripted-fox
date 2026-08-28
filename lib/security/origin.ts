import "server-only";

import { publicEnvironment } from "@/lib/env/public";

export function isTrustedSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(publicEnvironment.NEXT_PUBLIC_SITE_URL).origin;
  } catch {
    return false;
  }
}
