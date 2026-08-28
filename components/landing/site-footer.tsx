import Link from "next/link";
import { Clapperboard } from "lucide-react";

export function SiteFooter({ variant = "default" }: { variant?: "default" | "creator" }) {
  if (variant === "creator") {
    return (
      <footer className="site-footer site-footer--creator section-shell">
        <div className="site-footer__statement">Make the next upload easier to start.</div>
        <div className="site-footer__meta">
          <span className="wordmark creator-wordmark">
            <span className="creator-wordmark__mark" aria-hidden="true"><Clapperboard size={18} /></span>
            Next Video
          </span>
          <nav aria-label="Footer navigation">
            <Link href="#how-it-works">How it works</Link>
            <Link href="#video-plan">Video plan</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="#faq">FAQ</Link>
          </nav>
          <span>Plan, write, and prepare to record · © 2026</span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="site-footer section-shell">
      <div className="site-footer__meta">
        <span className="wordmark">Next Video</span>
        <nav aria-label="Footer navigation">
          <Link href="#how-it-works">How it works</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="#faq">FAQ</Link>
        </nav>
        <span>Plan, write, and prepare to record · © 2026</span>
      </div>
    </footer>
  );
}
