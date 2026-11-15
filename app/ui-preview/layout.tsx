import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "@/app/dashboard/dashboard.css";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function UiPreviewLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
