"use server";

import { redirect } from "next/navigation";

import { requireAuthenticatedUser } from "@/lib/auth/session";
import { getBillingAccess, hasBillingFeature } from "@/lib/billing/access";
import { getChannelAnalytics } from "@/lib/youtube/analytics";

export async function syncAnalytics() {
  const user = await requireAuthenticatedUser();
  const access = await getBillingAccess(user.id);
  if (!hasBillingFeature(access, "advanced_analytics")) redirect("/dashboard/upgrade?feature=advanced_analytics");
  await getChannelAnalytics(user.id, { forceRefresh: true });
  redirect("/dashboard/analytics");
}
