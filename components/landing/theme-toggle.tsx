"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type LandingTheme = "light" | "dark";

export function ThemeToggle({ showLabel = false }: { showLabel?: boolean }) {
  const [theme, setTheme] = useState<LandingTheme>("light");

  useEffect(() => {
    document.documentElement.dataset.nextVideoTheme = "light";
    window.localStorage.removeItem("next-video:theme");
    window.localStorage.removeItem("next-video:landing-theme");
    const frame = window.requestAnimationFrame(() => setTheme("light"));

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const toggleTheme = () => {
    const current = document.documentElement.dataset.nextVideoTheme === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.nextVideoTheme = next;
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
