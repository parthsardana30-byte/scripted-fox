import { SupportCenter } from "@/components/support/support-center";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Help & Support",
  description: "Find answers and contact Scripted Fox support.",
  path: "/help",
});

export default async function HelpPage({ searchParams }: { searchParams: Promise<{ category?: string; faq?: string; view?: string }> }) {
  const query = await searchParams;
  return <SupportCenter initialCategory={query.category} initialFaq={query.faq} initialView={query.view} />;
}
