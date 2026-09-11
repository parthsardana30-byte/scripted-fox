import type { Metadata } from "next";

import { SupportCenter } from "@/components/support/support-center";

export const metadata: Metadata = {
  title: "Help & Support",
  description: "Find answers and contact Scripted Fox support.",
};

export default async function HelpPage({ searchParams }: { searchParams: Promise<{ category?: string; faq?: string; view?: string }> }) {
  const query = await searchParams;
  return <SupportCenter initialCategory={query.category} initialFaq={query.faq} initialView={query.view} />;
}
