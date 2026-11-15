"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FileText,
  ImagePlus,
  Lightbulb,
  Menu,
  MessagesSquare,
  Plus,
  Settings,
  TrendingUp,
  X,
} from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { DashboardGooeyNav } from "@/components/dashboard/dashboard-gooey-nav";
import { ThemeToggle } from "@/components/landing/theme-toggle";
import { getPlanDisplayName, type PlanCode } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";
import { CreditBadge } from "./credit-badge";
import creditStyles from "./credit-badge.module.css";

const primaryNavigation = [
  { href: "/dashboard/trending", label: "Trending Hub", icon: TrendingUp },
  { href: "/dashboard/editor", label: "Script Hub", icon: FileText },
  { href: "/dashboard/ideas", label: "Recommendations", icon: Lightbulb },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/thumbnails", label: "Thumbnail Studio", icon: ImagePlus },
];

const utilityNavigation = [
  { href: "/help", label: "Help & Support", icon: MessagesSquare },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardShell({ children, previewMode = false, activePreview = "overview", defaultCollapsed = true, plan = "free" }: { children: React.ReactNode; previewMode?: boolean; activePreview?: string; defaultCollapsed?: boolean; plan?: PlanCode }) {
  const pathname = usePathname();
  const isHelpPage = pathname === "/help" || pathname.startsWith("/help/");
  const isFullScriptEditor = pathname.startsWith("/dashboard/editor/");
  const usesScrollableWorkspace = previewMode
    || pathname === "/help"
    || pathname === "/connect"
    || (pathname.startsWith("/dashboard") && !isFullScriptEditor);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const previewView = (href: string) => href === "/dashboard" ? "overview"
    : href === "/dashboard/upgrade" ? "plans"
    : href === "/dashboard/credits" ? "credits"
    : href === "/dashboard/thumbnails" ? "thumbnails"
    : href === "/dashboard/trending" ? "trending"
      : href === "/dashboard/editor" ? "script"
        : href === "/dashboard/ideas" ? "topics"
          : href === "/dashboard/analytics" ? "analytics"
            : href === "/help" ? "help"
              : "settings";
  const destination = (href: string) => previewMode
    ? `/ui-preview${previewView(href) === "overview" ? "" : `?view=${previewView(href)}`}`
    : href;
  const isActive = (href: string, exact?: boolean) => previewMode
    ? activePreview === previewView(href)
    : exact ? pathname === href : pathname.startsWith(href);
  const planUi = plan === "elite"
    ? { key: "pro", label: getPlanDisplayName(plan) }
    : plan === "pro"
      ? { key: "plus", label: getPlanDisplayName(plan) }
      : { key: "basic", label: getPlanDisplayName(plan) };

  return (
    <div className={cn("dashboard-app", collapsed && "dashboard-app--collapsed")}>
      <a className="dashboard-skip" href="#dashboard-content">Skip to content</a>
      <header className="dashboard-mobile-header">
        <button className="dashboard-icon-button" type="button" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
          <Menu size={20} aria-hidden="true" />
        </button>
        <Link className="dashboard-wordmark" href={destination("/dashboard")} prefetch aria-label="Scripted Fox dashboard" title="Home" aria-current={isActive("/dashboard", true) ? "page" : undefined}><BrandLogo /></Link>
        <div className="dashboard-mobile-actions">
          <span className="dashboard-mobile-theme"><ThemeToggle /></span>
          <Link className="dashboard-mobile-new" href={destination("/dashboard/editor")} prefetch aria-label="Open Script Hub"><Plus size={19} aria-hidden="true" /></Link>
        </div>
      </header>

      {mobileOpen && <button className="dashboard-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside
        className={cn("dashboard-sidebar", mobileOpen && "dashboard-sidebar--open")}
        aria-label="Dashboard navigation"
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") setCollapsed(false);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") setCollapsed(true);
        }}
        onFocusCapture={() => setCollapsed(false)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setCollapsed(true);
        }}
      >
        <div className="dashboard-sidebar__top">
          <Link className="dashboard-wordmark" href={destination("/dashboard")} prefetch aria-label="Scripted Fox dashboard" title="Home" aria-current={isActive("/dashboard", true) ? "page" : undefined} onClick={() => setMobileOpen(false)}>
            <BrandLogo labelClassName="dashboard-nav-label" />
          </Link>
          <button className="dashboard-sidebar__close" type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {previewMode && <div className="dashboard-demo-session" title="Local preview account">
          <span aria-hidden="true" />
          <div className="dashboard-nav-label"><strong>Demo session</strong><small>Parth · Basic</small></div>
        </div>}

        <DashboardGooeyNav
          items={primaryNavigation.map(({ href, label, icon }) => ({
            href: destination(href),
            label,
            icon,
            active: isActive(href),
          }))}
          collapsed={collapsed}
          onNavigate={() => setMobileOpen(false)}
          particleCount={8}
          particleDistances={[90, 10]}
          particleR={100}
          animationTime={600}
          timeVariance={300}
          colors={[1, 2, 3, 1, 2, 3, 1, 4]}
        />

        <nav className="dashboard-nav dashboard-nav--utility" aria-label="Account">
          {utilityNavigation.map(({ href, label, icon: Icon }) => (
            <Link key={href} className={cn("dashboard-nav__link", isActive(href) && "dashboard-nav__link--active")} href={destination(href)} prefetch aria-current={isActive(href) ? "page" : undefined} title={collapsed ? label : undefined} onClick={() => setMobileOpen(false)}>
              <span className="dashboard-nav-icon"><Icon size={18} aria-hidden="true" /></span>
              <span className="dashboard-nav-label">{label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <main className={cn("dashboard-main", usesScrollableWorkspace && "dashboard-main--scroll-frame", isHelpPage && "dashboard-main--support")} id="dashboard-content" tabIndex={-1}>
        <div className={`dashboard-global-tools ${creditStyles.tools}`} aria-label="Dashboard tools">
          <div className="dashboard-global-controls">
            <CreditBadge preview={previewMode} />
            <Link className={`dashboard-plan-badge dashboard-plan-badge--${planUi.key}`} href={destination("/dashboard/upgrade")} aria-label={`Current plan: ${planUi.label}`}>
              <strong>{planUi.label}</strong>
            </Link>
            <span className="dashboard-global-theme"><ThemeToggle /></span>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
