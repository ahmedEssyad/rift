"use client";

import { useState, useEffect } from "react";
import { X, Github } from "lucide-react";
import ThemeToggle, { ThemeToggleInline } from "./ThemeToggle";

const NAV_ITEMS = ["Features", "Frameworks", "Demo", "Install"];
const BLOG_URL = "https://blog.essyad.site/rift-the-architecture-of-a-zero-config-dev-runner";

export default function FloatingNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <>
      {/* Desktop + Mobile Header Bar */}
      <header className="fixed top-6 inset-x-0 z-50 px-6">
        <nav
          className="max-w-[1200px] mx-auto flex items-center justify-between px-6 py-3 rounded-[32px] bg-[var(--surface)]/80 backdrop-blur-xl border border-[var(--border)]/50"
          style={{ boxShadow: "0 4px 30px rgba(0, 0, 0, 0.03)" }}
        >
          <a
            href="#"
            className="text-[20px] font-bold tracking-[-0.05em] text-[var(--text-primary)] hover:opacity-80 transition-opacity font-mono"
          >
            rift
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="px-4 py-2 text-[14px] font-medium text-[var(--text-primary)] rounded-full hover:bg-[var(--surface-secondary)] transition-colors duration-150"
              >
                {item}
              </a>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <a
              href={BLOG_URL}
              className="text-[14px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-150"
            >
              Blog
            </a>
            <a
              href="https://github.com/ahmedEssyad/rift"
              className="text-[14px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-150 flex items-center gap-2"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
            <a
              href="#install"
              className="px-5 py-2.5 text-[14px] font-bold bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] rounded-full hover:opacity-90 transition-all duration-150"
            >
              Get Started
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--surface-secondary)] transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-[var(--text-primary)]" />
            ) : (
              <div className="w-5 flex flex-col gap-1.5">
                <span className="h-[2px] w-5 bg-[var(--text-primary)] rounded-full" />
                <span className="h-[2px] w-5 bg-[var(--text-primary)] rounded-full" />
              </div>
            )}
          </button>
        </nav>
      </header>

      {/* Mobile Menu — full screen overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-[var(--background)] md:hidden flex flex-col pt-28 px-6 overflow-y-auto">
          {/* Nav links */}
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                onClick={closeMenu}
                className="px-4 py-4 text-lg font-medium text-[var(--text-primary)] rounded-2xl hover:bg-[var(--surface-secondary)] transition-colors"
              >
                {item}
              </a>
            ))}
            <a
              href={BLOG_URL}
              onClick={closeMenu}
              className="px-4 py-4 text-lg font-medium text-[var(--text-primary)] rounded-2xl hover:bg-[var(--surface-secondary)] transition-colors"
            >
              Blog
            </a>
          </div>

          {/* Theme switcher */}
          <div className="mt-6 pt-6 border-t border-[var(--border)]">
            <ThemeToggleInline />
          </div>

          {/* Actions */}
          <div className="mt-6 pt-6 border-t border-[var(--border)] space-y-3">
            <a
              href="https://github.com/ahmedEssyad/rift"
              onClick={closeMenu}
              className="flex items-center justify-center gap-2 w-full px-4 py-4 text-[15px] font-medium text-[var(--text-secondary)] rounded-2xl hover:bg-[var(--surface-secondary)] transition-colors"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
            <a
              href="#install"
              onClick={closeMenu}
              className="block w-full px-4 py-4 text-center text-[15px] font-bold bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] rounded-2xl hover:opacity-90 transition-all"
            >
              Get Started
            </a>
          </div>

          {/* Bottom links */}
          <div className="mt-auto mb-10 pt-6 flex items-center justify-center gap-6 text-[14px] text-[var(--text-muted)]">
            <a href="https://npmjs.com/package/rift-dev" className="hover:text-[var(--text-primary)] transition-colors">npm</a>
            <a href="https://github.com/ahmedEssyad/rift" className="hover:text-[var(--text-primary)] transition-colors">GitHub</a>
          </div>
        </div>
      )}
    </>
  );
}
