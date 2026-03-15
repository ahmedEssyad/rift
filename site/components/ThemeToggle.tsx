"use client";

import { useState, useEffect, useCallback } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

type Theme = "light" | "dark" | "system";

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored) {
      setTheme(stored);
      applyTheme(stored);
    } else {
      applyTheme("dark");
    }
  }, []);

  const changeTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
  }, []);

  return { theme, setTheme: changeTheme, mounted };
}

const THEMES: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
];

// Compact toggle for desktop nav — cycles through themes on click
export default function ThemeToggle() {
  const { theme, setTheme, mounted } = useTheme();

  if (!mounted) return <div className="w-9 h-9" />;

  const currentIdx = THEMES.findIndex((t) => t.value === theme);
  const CurrentIcon = THEMES[currentIdx >= 0 ? currentIdx : 1].icon;

  const cycleTheme = () => {
    const nextIdx = (currentIdx + 1) % THEMES.length;
    setTheme(THEMES[nextIdx].value);
  };

  return (
    <button
      onClick={cycleTheme}
      className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--surface-secondary)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      aria-label={`Theme: ${theme}. Click to change.`}
    >
      <CurrentIcon className="w-4 h-4" />
    </button>
  );
}

// Inline row for mobile menu — shows all three options side by side
export function ThemeToggleInline() {
  const { theme, setTheme, mounted } = useTheme();

  if (!mounted) return <div className="h-12" />;

  return (
    <div className="flex items-center justify-center gap-2 py-3">
      {THEMES.map((t) => {
        const Icon = t.icon;
        const isActive = theme === t.value;
        return (
          <button
            key={t.value}
            onClick={() => setTheme(t.value)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
              isActive
                ? "bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Icon className="w-4 h-4" />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
