"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type LandingTheme = "light" | "dark";

const STORAGE_KEY = "next-video:theme";
const LEGACY_STORAGE_KEY = "next-video:landing-theme";

export function ThemeToggle({ showLabel = false }: { showLabel?: boolean }) {
  const [theme, setTheme] = useState<LandingTheme>("light");

  useEffect(() => {
    const stored = (window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY)) as LandingTheme | null;
    const prefersDark = typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = stored === "light" || stored === "dark"
      ? stored
      : prefersDark ? "dark" : "light";

    document.documentElement.dataset.nextVideoTheme = initial;
    const frame = window.requestAnimationFrame(() => setTheme(initial));

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const toggleTheme = () => {
    const current = document.documentElement.dataset.nextVideoTheme === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.nextVideoTheme = next;
    window.localStorage.setItem(STORAGE_KEY, next);
    setTheme(next);
  };

  return (
    <button
      className="theme-toggle landing-theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label="Switch light or dark theme"
      title="Switch light or dark theme"
    >
      <Moon className="landing-theme-toggle__moon" aria-hidden="true" size={18} />
      <Sun className="landing-theme-toggle__sun" aria-hidden="true" size={18} />
      {showLabel && <span className="theme-toggle__label">{theme === "dark" ? "Dark mode" : "Light mode"}</span>}
    </button>
  );
}
