"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type GooeyNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
};

type DashboardGooeyNavProps = {
  items: GooeyNavItem[];
  collapsed: boolean;
  onNavigate: () => void;
  particleCount?: number;
  particleDistances?: [number, number];
  particleR?: number;
  animationTime?: number;
  timeVariance?: number;
  colors?: number[];
};

type Particle = {
  start: [number, number];
  end: [number, number];
  time: number;
  scale: number;
  color: number;
  rotate: number;
};

const particleNoise = (amount = 1) => amount / 2 - Math.random() * amount;

function particleXY(distance: number, pointIndex: number, totalPoints: number): [number, number] {
  const angle = ((360 + particleNoise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
  return [distance * Math.cos(angle), distance * Math.sin(angle)];
}

function buildParticle(index: number, time: number, count: number, distances: [number, number], radius: number, palette: number[]): Particle {
  const rotate = particleNoise(radius / 10);
  return {
    start: particleXY(distances[0], count - index, count),
    end: particleXY(distances[1] + particleNoise(7), count - index, count),
    time,
    scale: 1 + particleNoise(0.2),
    color: palette[Math.floor(Math.random() * palette.length)] ?? 1,
    rotate: rotate > 0 ? (rotate + radius / 20) * 10 : (rotate - radius / 20) * 10,
  };
}

export function DashboardGooeyNav({
  items,
  collapsed,
  onNavigate,
  particleCount = 15,
  particleDistances = [90, 10],
  particleR = 100,
  animationTime = 600,
  timeVariance = 300,
  colors = [1, 2, 3, 1, 2, 3, 1, 4],
}: DashboardGooeyNavProps) {
  const navRef = useRef<HTMLElement>(null);
  const effectRef = useRef<HTMLSpanElement>(null);
  const timersRef = useRef<number[]>([]);
  const routeIndex = Math.max(0, items.findIndex((item) => item.active));
  const clearParticles = () => {
    timersRef.current.forEach(window.clearTimeout);
    timersRef.current = [];
    effectRef.current?.querySelectorAll(".dashboard-gooey-particle").forEach((particle) => particle.remove());
  };

  const positionEffect = (index: number) => {
    const nav = navRef.current;
    const effect = effectRef.current;
    const link = nav?.querySelectorAll<HTMLElement>(".dashboard-nav__link")[index];
    if (!nav || !effect || !link) return;

    const navRect = nav.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    Object.assign(effect.style, {
      left: `${linkRect.left - navRect.left}px`,
      top: `${linkRect.top - navRect.top}px`,
      width: `${linkRect.width}px`,
      height: `${linkRect.height}px`,
    });
  };

  const makeParticles = () => {
    const effect = effectRef.current;
    if (!effect || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    clearParticles();

    for (let index = 0; index < particleCount; index += 1) {
      const time = animationTime * 2 + particleNoise(timeVariance * 2);
      const particleData = buildParticle(index, time, particleCount, particleDistances, particleR, colors);
      const timer = window.setTimeout(() => {
        const particle = document.createElement("span");
        const point = document.createElement("span");
        particle.className = "dashboard-gooey-particle";
        point.className = "dashboard-gooey-point";
        particle.style.setProperty("--start-x", `${particleData.start[0]}px`);
        particle.style.setProperty("--start-y", `${particleData.start[1]}px`);
        particle.style.setProperty("--end-x", `${particleData.end[0]}px`);
        particle.style.setProperty("--end-y", `${particleData.end[1]}px`);
        particle.style.setProperty("--particle-time", `${particleData.time}ms`);
        particle.style.setProperty("--particle-scale", `${particleData.scale}`);
        particle.style.setProperty("--particle-color", `var(--gooey-color-${particleData.color})`);
        particle.style.setProperty("--particle-rotate", `${particleData.rotate}deg`);
        particle.appendChild(point);
        effect.appendChild(particle);
        const removeTimer = window.setTimeout(() => particle.remove(), time);
        timersRef.current.push(removeTimer);
      }, 30);
      timersRef.current.push(timer);
    }
  };

  const activate = (index: number) => {
    if (index === routeIndex) return;
    requestAnimationFrame(() => {
      positionEffect(index);
      const effect = effectRef.current;
      if (!effect) return;
      effect.classList.remove("dashboard-gooey-effect--active");
      void effect.offsetWidth;
      effect.classList.add("dashboard-gooey-effect--active");
      makeParticles();
    });
  };

  useEffect(() => {
    positionEffect(routeIndex);
  }, [routeIndex, collapsed]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => positionEffect(routeIndex));
    observer.observe(nav);
    return () => observer.disconnect();
  }, [routeIndex]);

  useEffect(() => () => clearParticles(), []);

  return (
    <nav className="dashboard-nav dashboard-gooey-nav" aria-label="Main" ref={navRef}>
      {items.map(({ href, label, icon: Icon, active }, index) => (
        <Link
          key={href}
          className={cn("dashboard-nav__link", active && "dashboard-nav__link--active")}
          href={href}
          prefetch
          aria-current={active ? "page" : undefined}
          title={collapsed ? label : undefined}
          onPointerDown={() => activate(index)}
          onClick={onNavigate}
        >
          <span className="dashboard-nav-icon"><Icon size={18} aria-hidden="true" /></span>
          <span className="dashboard-nav-label">{label}</span>
        </Link>
      ))}
      <span className="dashboard-gooey-effect dashboard-gooey-effect--active" ref={effectRef} aria-hidden="true" />
    </nav>
  );
}
