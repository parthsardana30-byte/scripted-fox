import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getAuthenticatedUser } from "@/lib/auth/session";
import "@fontsource-variable/manrope";
import "./dashboard.css";
import "./creator-playback.css";

export const metadata: Metadata = {
  title: { default: "Dashboard · Scripted Fox", template: "%s · Scripted Fox" },
  description: "Plan, write, and improve your next YouTube video.",
};

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/sign-in?next=/dashboard");
  return <DashboardShell>{children}</DashboardShell>;
}
