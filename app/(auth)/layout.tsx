import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { AuthAside } from "@/components/auth/auth-aside";
import { ThemeToggle } from "@/components/landing/theme-toggle";
import "../landing-youtube.css";
import "./auth.css";
import "./creator-auth.css";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-shell">
      <header className="auth-header auth-header--global">
        <Link className="auth-wordmark" href="/" aria-label="Scripted Fox home">
          <BrandLogo />
        </Link>
        <ThemeToggle />
      </header>

      <div className="auth-shell__stage">
        <section className="auth-shell__form-side" aria-label="Account access">
          <div className="auth-shell__content">{children}</div>
        </section>

        <AuthAside />
      </div>
    </main>
  );
}
