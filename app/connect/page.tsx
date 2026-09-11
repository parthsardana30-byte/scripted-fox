import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/auth/session";

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/sign-in?next=/connect");

  const query = await searchParams;
  if (query.error === "channel_in_use") redirect("/dashboard?youtube=channel_in_use");

  const params = new URLSearchParams({ youtube: "connect" });
  if (query.status) params.set("notice", query.status);
  if (query.error) params.set("issue", query.error);
  redirect(`/dashboard?${params.toString()}`);
}
