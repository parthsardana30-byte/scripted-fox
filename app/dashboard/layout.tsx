import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { getBillingAccess } from "@/lib/billing/access";
import "@fontsource-variable/manrope";
import "./creator-playback.css";
import "./dashboard.css";

export const metadata: Metadata = {
  title: { default: "Dashboard · Scripted Fox", template: "%s · Scripted Fox" },
  description: "Plan, write, and improve your next YouTube video.",
};

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/sign-in?next=/dashboard");
  const access = await getBillingAccess(user.id);
  return <DashboardShell plan={access.plan}>{children}</DashboardShell>;
}
