import { ThumbnailStudio } from "@/components/dashboard/thumbnail-studio";
import Link from "next/link";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { canUseThumbnailStudio } from "@/lib/thumbnails/access";
export const metadata = { title: "Thumbnail Studio" };
export default async function ThumbnailsPage() {
  const user = await requireAuthenticatedUser();
  if (!await canUseThumbnailStudio(user.id)) return (
    <div className="dashboard-page">
      <div className="dashboard-empty">
        <p className="dashboard-kicker">Gold exclusive</p>
        <h1>Thumbnail Studio</h1>
        <p>Upgrade to Gold to create thumbnails with your photos. Gold includes one free thumbnail daily, then 10 Fox Credits per thumbnail.</p>
        <Link className="button button--primary" href="/dashboard/upgrade?plan=elite">Upgrade to Gold</Link>
      </div>
    </div>
  );
  return <ThumbnailStudio />;
}
