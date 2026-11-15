import { redirect } from "next/navigation";

export default async function CreatePage({ searchParams }: { searchParams: Promise<{ idea?: string }> }) {
  const { idea } = await searchParams;
  const topic = typeof idea === "string" ? idea.trim().slice(0, 180) : "";
  redirect(topic ? `/dashboard/editor?topic=${encodeURIComponent(topic)}` : "/dashboard/editor");
}
