import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { DiwaliLaunch } from "./diwali-launch";

export function SiteFooter({ variant = "default" }: { variant?: "default" | "creator" }) {
  if (variant === "creator") {
    return (
      <footer className="site-footer site-footer--creator section-shell">
        <div className="site-footer__statement">
          <span className="site-footer__statement-text">
            <span className="site-footer__statement-line">Write the next</span>
            <span className="site-footer__statement-line">video people stay</span>
            <span className="site-footer__statement-line site-footer__statement-tail">
              <span>for.</span>
              <DiwaliLaunch />
            </span>
          </span>
        </div>
        <div className="site-footer__meta">
          <BrandLogo animated={false} className="wordmark creator-wordmark" />
          <nav aria-label="Footer navigation">
            <Link href="/how-it-works">How it works</Link>
            <Link href="/video-plan">Video plan</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/refund-policy">Refunds</Link>
            <Link href="/cookies">Cookies</Link>
          </nav>
          <span>Plan, write, and prepare to record · © 2026</span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="site-footer section-shell">
      <div className="site-footer__meta">
        <BrandLogo animated={false} className="wordmark" />
        <nav aria-label="Footer navigation">
          <Link href="#how-it-works">How it works</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="#faq">FAQ</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/refund-policy">Refunds</Link>
          <Link href="/cookies">Cookies</Link>
        </nav>
        <span>Plan, write, and prepare to record · © 2026</span>
      </div>
    </footer>
  );
}
