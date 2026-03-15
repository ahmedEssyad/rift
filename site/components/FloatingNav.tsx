"use client";

import { useState, useEffect } from "react";
import { X, Github } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const NAV_ITEMS = ["Features", "Frameworks", "Demo", "Install"];
const BLOG_URL = "https://blog.essyad.site/rift-the-architecture-of-a-zero-config-dev-runner";

export default function FloatingNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [mobileMenuOpen]);

  return (
    <>
      <header className="fixed top-6 inset-x-0 z-50 px-6">
        <nav
          className="max-w-[1200px] mx-auto flex items-center justify-between px-6 py-3 rounded-[32px] bg-[var(--surface)]/80 backdrop-blur-xl border border-[var(--border)]/50"
          style={{ boxShadow: '0 4px 30px rgba(0, 0, 0, 0.03)' }}
        >
          <a
            href="#"
            className="text-[20px] font-bold tracking-[-0.05em] text-[var(--text-primary)] hover:opacity-80 transition-opacity font-mono"
          >
            rift
          </a>

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

      {/* Mobile Menu Overlay */}
      <div className={`
        fixed inset-0 bg-[var(--background)] z-40 transition-all duration-300 ease-out md:hidden flex flex-col pt-28 px-6
        ${mobileMenuOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-4 pointer-events-none'}
      `}>
        <div className="flex flex-col gap-2">
          {NAV_ITEMS.map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-4 text-lg font-medium text-[var(--text-primary)] rounded-2xl hover:bg-[var(--surface-secondary)] transition-colors"
            >
              {item}
            </a>
          ))}
        </div>

        <div className="mt-8 pt-8 border-t border-[var(--border)] space-y-3">
          <a
            href={BLOG_URL}
            onClick={() => setMobileMenuOpen(false)}
            className="block w-full px-4 py-4 text-center text-[15px] font-medium text-[var(--text-secondary)] rounded-2xl hover:bg-[var(--surface-secondary)] transition-colors"
          >
            Blog
          </a>
          <a
            href="https://github.com/ahmedEssyad/rift"
            onClick={() => setMobileMenuOpen(false)}
            className="block w-full px-4 py-4 text-center text-[15px] font-medium text-[var(--text-secondary)] rounded-2xl hover:bg-[var(--surface-secondary)] transition-colors"
          >
            GitHub
          </a>
          <a
            href="#install"
            onClick={() => setMobileMenuOpen(false)}
            className="block w-full px-4 py-4 text-center text-[15px] font-bold bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] rounded-2xl hover:opacity-90 transition-all"
          >
            Get Started
          </a>
        </div>

        <div className="mt-auto mb-10 flex items-center justify-center gap-6 text-[14px] text-[var(--text-secondary)]">
          <ThemeToggle />
          <a href="https://npmjs.com/package/rift-dev" className="hover:text-[var(--text-primary)] transition-colors">npm</a>
          <a href="https://github.com/ahmedEssyad/rift" className="hover:text-[var(--text-primary)] transition-colors">GitHub</a>
        </div>
      </div>
    </>
  );
}
