import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader({
  variant = "default",
  isAuthenticated = false,
}: {
  variant?: "default" | "creator";
  isAuthenticated?: boolean;
}) {
  if (variant === "creator") {
    return (
      <header className="site-header site-header--creator">
        <div className="site-header__inner">
          <Link className="wordmark creator-wordmark" href="/" aria-label="Scripted Fox home">
            <BrandLogo />
          </Link>
          <nav className="site-header__nav" aria-label="Main navigation">
            <Link href="/how-it-works">How it works</Link>
            <Link href="/video-plan">Video plan</Link>
            <Link href="/pricing">Pricing</Link>
          </nav>
          <div className="site-header__actions">
            <ThemeToggle />
            {isAuthenticated ? (
              <Button asChild size="small" className="creator-start-button">
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild size="small" variant="quiet" className="creator-sign-in">
                  <Link href="/sign-in">Sign in</Link>
                </Button>
                <Button asChild size="small" className="creator-start-button">
                  <Link href="/sign-up?next=/dashboard">Start planning</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="wordmark" href="/" aria-label="Scripted Fox home">
          <BrandLogo />
        </Link>
        <nav className="site-header__nav" aria-label="Main navigation">
          <Link href="/pricing">Pricing</Link>
        </nav>
        <div className="site-header__actions">
          {isAuthenticated ? (
            <Button asChild size="small">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild size="small" variant="quiet">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild size="small">
                <Link href="/connect">Find my next video</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
