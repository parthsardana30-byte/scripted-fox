import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function CreatePage({ searchParams }: { searchParams: Promise<{ idea?: string }> }) {
  const { idea } = await searchParams;
  return (
    <main className="placeholder-page">
      <div className="placeholder-page__panel">
        <span className="demo-label">Landing-page placeholder</span>
        <LockKeyhole aria-hidden="true" size={28} />
        <h1>Your idea is ready for the real creation flow.</h1>
        {idea ? <blockquote>“{idea}”</blockquote> : null}
        <p>This route intentionally stops here. No channel analysis or script generation has occurred in this landing-page implementation.</p>
        <div className="placeholder-page__actions">
          <Button asChild><Link href="/"><ArrowLeft aria-hidden="true" size={17} />Back to the landing page</Link></Button>
          <Button asChild variant="secondary"><Link href="/connect">Add channel context</Link></Button>
        </div>
      </div>
    </main>
  );
}
