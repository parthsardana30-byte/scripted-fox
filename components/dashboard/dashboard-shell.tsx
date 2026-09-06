"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FileText,
  Menu,
  Plus,
  Settings,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { ThemeToggle } from "@/components/landing/theme-toggle";
import { cn } from "@/lib/utils";

const primaryNavigation = [
  { href: "/dashboard", label: "Overview", icon: BarChart3, exact: true },
  { href: "/dashboard/trending", label: "Trending Hub", icon: TrendingUp },
  { href: "/dashboard/editor", label: "Script Hub", icon: FileText },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
];

const utilityNavigation = [
  { href: "/dashboard/account", label: "Account", icon: UserRound },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardShell({ children, previewMode = false, activePreview = "overview", defaultCollapsed = true }: { children: React.ReactNode; previewMode?: boolean; activePreview?: string; defaultCollapsed?: boolean }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  const previewView = (href: string) => href === "/dashboard" ? "overview"
    : href === "/dashboard/trending" ? "trending"
      : href === "/dashboard/editor" ? "script"
        : href === "/dashboard/ideas" ? "topics"
          : href === "/dashboard/analytics" ? "analytics"
            : href === "/dashboard/account" ? "account" : "settings";
  const destination = (href: string) => previewMode
    ? `/ui-preview${previewView(href) === "overview" ? "" : `?view=${previewView(href)}`}`
    : href;
  const isActive = (href: string, exact?: boolean) => previewMode
    ? activePreview === previewView(href)
    : exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className={cn("dashboard-app", collapsed && "dashboard-app--collapsed")}>
      <a className="dashboard-skip" href="#dashboard-content">Skip to content</a>
      <header className="dashboard-mobile-header">
        <button className="dashboard-icon-button" type="button" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
          <Menu size={20} aria-hidden="true" />
        </button>
        <Link className="dashboard-wordmark" href={destination("/dashboard")} prefetch aria-label="Scripted Fox dashboard"><BrandLogo /></Link>
        <Link className="dashboard-mobile-new" href={destination("/dashboard/editor")} prefetch aria-label="Open Script Hub"><Plus size={19} aria-hidden="true" /></Link>
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
          <Link className="dashboard-wordmark" href={destination("/dashboard")} prefetch aria-label="Scripted Fox dashboard" onClick={() => setMobileOpen(false)}>
            <BrandLogo labelClassName="dashboard-nav-label" />
          </Link>
          <button className="dashboard-sidebar__close" type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <Link className="dashboard-new-script" href={destination("/dashboard/editor")} prefetch onClick={() => setMobileOpen(false)}>
          <Plus size={18} aria-hidden="true" />
          <span className="dashboard-nav-label">Create script</span>
        </Link>

        {previewMode && <div className="dashboard-demo-session" title="Local preview account">
          <span aria-hidden="true" />
          <div className="dashboard-nav-label"><strong>Demo session</strong><small>Parth · Plus</small></div>
        </div>}

        <nav className="dashboard-nav" aria-label="Main">
          {primaryNavigation.map(({ href, label, icon: Icon, exact }) => (
            <Link key={href} className={cn("dashboard-nav__link", isActive(href, exact) && "dashboard-nav__link--active")} href={destination(href)} prefetch aria-current={isActive(href, exact) ? "page" : undefined} title={collapsed ? label : undefined} onClick={() => setMobileOpen(false)}>
            <span className="dashboard-nav-icon"><Icon size={18} aria-hidden="true" /></span>
              <span className="dashboard-nav-label">{label}</span>
            </Link>
          ))}
        </nav>

        <nav className="dashboard-nav dashboard-nav--utility" aria-label="Account">
          <div className="dashboard-theme-switch">
            <ThemeToggle showLabel />
          </div>
          {utilityNavigation.map(({ href, label, icon: Icon }) => (
            <Link key={href} className={cn("dashboard-nav__link", isActive(href) && "dashboard-nav__link--active")} href={destination(href)} prefetch aria-current={isActive(href) ? "page" : undefined} title={collapsed ? label : undefined} onClick={() => setMobileOpen(false)}>
              <span className="dashboard-nav-icon"><Icon size={18} aria-hidden="true" /></span>
              <span className="dashboard-nav-label">{label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <main className="dashboard-main" id="dashboard-content" tabIndex={-1}>{children}</main>
    </div>
  );
}
