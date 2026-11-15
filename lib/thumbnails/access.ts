import "server-only";
import { getBillingAccess } from "@/lib/billing/access";

export async function canUseThumbnailStudio(userId: string) {
  const access = await getBillingAccess(userId);
  return access.plan === "elite" && access.status === "active"
    && !!access.currentPeriodEnd && Date.parse(access.currentPeriodEnd) > Date.now();
}
