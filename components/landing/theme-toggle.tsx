"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

type LandingTheme = "light" | "dark";
const THEME_STORAGE_KEY = "scripted-fox:theme";
const THEME_CHANGE_EVENT = "scripted-fox:theme-change";

function currentTheme(): LandingTheme {
  return document.documentElement.dataset.nextVideoTheme === "dark" ? "dark" : "light";
}

export function ThemeToggle({ showLabel = false }: { showLabel?: boolean }) {
  const theme = useSyncExternalStore(
    (onChange) => {
      window.addEventListener(THEME_CHANGE_EVENT, onChange);
      window.addEventListener("storage", onChange);
      return () => {
        window.removeEventListener(THEME_CHANGE_EVENT, onChange);
        window.removeEventListener("storage", onChange);
      };
    },
    currentTheme,
    () => "light",
  );

  const toggleTheme = () => {
    const current = currentTheme();
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.nextVideoTheme = next;
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  };

  return (
    <button
      className="theme-toggle landing-theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      suppressHydrationWarning
    >
      <Moon className="landing-theme-toggle__moon" aria-hidden="true" size={18} />
      <Sun className="landing-theme-toggle__sun" aria-hidden="true" size={18} />
      {showLabel && <span className="theme-toggle__label">{theme === "dark" ? "Dark mode" : "Light mode"}</span>}
    </button>
  );
}
