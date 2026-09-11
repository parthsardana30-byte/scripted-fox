import "@fontsource-variable/manrope";
import "@/app/dashboard/dashboard.css";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function HelpLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <DashboardShell>{children}</DashboardShell>;
}
