import "server-only";

import { serverEnvironment } from "@/lib/env/server";

export function isPlanTestingUser(userId: string) {
  const allowedUserIds = serverEnvironment.BILLING_TEST_USER_IDS
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean) ?? [];
  return allowedUserIds.includes(userId);
}
