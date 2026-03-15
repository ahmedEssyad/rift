"use client";

import { useState, useEffect } from "react";
import { Check, Sun, Moon, Monitor } from "lucide-react";

type Theme = "light" | "dark" | "system";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored) {
      setTheme(stored);
      document.documentElement.setAttribute("data-theme", stored);
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  const changeTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  return { theme, setTheme: changeTheme, mounted };
}

export default function ThemeToggle() {
  const { theme, setTheme, mounted } = useTheme();
  const [open, setOpen] = useState(false);

  if (!mounted) {
    return <div className="w-9 h-9" />;
  }

  const themes: { value: Theme; icon: React.ReactNode; label: string }[] = [
    { value: "light", icon: <Sun className="w-4 h-4" />, label: "Light" },
    { value: "dark", icon: <Moon className="w-4 h-4" />, label: "Dark" },
    { value: "system", icon: <Monitor className="w-4 h-4" />, label: "System" },
  ];

  const currentIcon = themes.find((t) => t.value === theme)?.icon || <Moon className="w-4 h-4" />;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--surface-secondary)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        aria-label="Toggle theme"
      >
        {currentIcon}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden min-w-[140px]">
            {themes.map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setTheme(t.value);
                  setOpen(false);
                }}
                className={`w-full px-4 py-2.5 flex items-center gap-3 text-sm transition-colors ${theme === t.value
                  ? "bg-[var(--surface-secondary)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
                  }`}
              >
                {t.icon}
                <span>{t.label}</span>
                {theme === t.value && <Check className="w-4 h-4 ml-auto text-[var(--accent)]" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
