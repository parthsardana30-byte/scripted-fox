"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ChevronLeft,
  Clapperboard,
  FileText,
  Home,
  Lightbulb,
  Menu,
  PanelLeft,
  Plus,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const primaryNavigation = [
  { href: "/dashboard", label: "Home", icon: Home, exact: true },
  { href: "/dashboard/editor", label: "Script Editor", icon: FileText },
  { href: "/dashboard/ideas", label: "Ideas", icon: Lightbulb },
  { href: "/dashboard/projects", label: "Projects", icon: PanelLeft },
  { href: "/dashboard/analytics", label: "Channel Analytics", icon: BarChart3 },
];

const utilityNavigation = [
  { href: "/dashboard/account", label: "Account", icon: UserRound },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) => exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className={cn("dashboard-app", collapsed && "dashboard-app--collapsed")}>
      <a className="dashboard-skip" href="#dashboard-content">Skip to content</a>
      <header className="dashboard-mobile-header">
        <button className="dashboard-icon-button" type="button" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
          <Menu size={20} aria-hidden="true" />
        </button>
        <Link className="dashboard-wordmark" href="/dashboard" prefetch>Next Video</Link>
        <Link className="dashboard-mobile-new" href="/dashboard/editor" prefetch aria-label="New script"><Plus size={19} aria-hidden="true" /></Link>
      </header>

      {mobileOpen && <button className="dashboard-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={cn("dashboard-sidebar", mobileOpen && "dashboard-sidebar--open")} aria-label="Dashboard navigation">
        <div className="dashboard-sidebar__top">
          <Link className="dashboard-wordmark" href="/dashboard" prefetch aria-label="Next Video dashboard" onClick={() => setMobileOpen(false)}>
            <span className="dashboard-wordmark__mark" aria-hidden="true"><Clapperboard size={18} /></span>
            <span className="dashboard-nav-label">Next Video</span>
          </Link>
          <button className="dashboard-sidebar__close" type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <Link className="dashboard-new-script" href="/dashboard/editor" prefetch onClick={() => setMobileOpen(false)}>
          <Plus size={18} aria-hidden="true" />
          <span className="dashboard-nav-label">New script</span>
        </Link>

        <nav className="dashboard-nav" aria-label="Main">
          {primaryNavigation.map(({ href, label, icon: Icon, exact }) => (
            <Link key={href} className={cn("dashboard-nav__link", isActive(href, exact) && "dashboard-nav__link--active")} href={href} prefetch aria-current={isActive(href, exact) ? "page" : undefined} title={collapsed ? label : undefined} onClick={() => setMobileOpen(false)}>
            <span className="dashboard-nav-icon"><Icon size={18} aria-hidden="true" /></span>
              <span className="dashboard-nav-label">{label}</span>
            </Link>
          ))}
        </nav>

        <nav className="dashboard-nav dashboard-nav--utility" aria-label="Account">
          {utilityNavigation.map(({ href, label, icon: Icon }) => (
            <Link key={href} className={cn("dashboard-nav__link", isActive(href) && "dashboard-nav__link--active")} href={href} prefetch aria-current={isActive(href) ? "page" : undefined} title={collapsed ? label : undefined} onClick={() => setMobileOpen(false)}>
              <span className="dashboard-nav-icon"><Icon size={18} aria-hidden="true" /></span>
              <span className="dashboard-nav-label">{label}</span>
            </Link>
          ))}
          <button className="dashboard-nav__link dashboard-collapse" type="button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}>
            <span className="dashboard-nav-icon"><ChevronLeft size={18} aria-hidden="true" /></span>
            <span className="dashboard-nav-label">Collapse</span>
          </button>
        </nav>
      </aside>

      <main className="dashboard-main" id="dashboard-content" tabIndex={-1}>{children}</main>
    </div>
  );
}
