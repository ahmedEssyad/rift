"use client";

import { ArrowRight, Github, Package } from "lucide-react";
import CopyButton from "./CopyButton";

export default function Install() {
  return (
    <section id="install" className="py-16 md:py-24 px-6 md:px-10">
      <div className="max-w-[600px] mx-auto text-center">
        <span className="block text-[11px] font-medium uppercase tracking-[0.15em] text-[var(--text-muted)] mb-4">
          Get Started
        </span>
        <h2 className="section-title mb-4 text-[var(--text-primary)]">
          10 seconds to <span className="text-[var(--text-muted)] font-serif italic">launch.</span>
        </h2>
        <p className="text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed mb-10">
          No global install needed. Just run it in your project.
        </p>

        {/* Install commands */}
        <div className="space-y-3 mb-10">
          <div className="flex items-center bg-[var(--surface)] border border-[var(--border)] rounded-xl px-5 py-4 gap-3">
            <code className="flex-1 text-left text-sm font-mono text-[var(--text-primary)]">
              <span className="text-[var(--text-muted)]">$</span> npm install -g rift-dev
            </code>
            <CopyButton text="npm install -g rift-dev" />
          </div>
          <div className="flex items-center bg-[var(--surface)] border border-[var(--border)] rounded-xl px-5 py-4 gap-3">
            <code className="flex-1 text-left text-sm font-mono text-[var(--text-primary)]">
              <span className="text-[var(--text-muted)]">$</span> rift init && rift run
            </code>
            <CopyButton text="rift init && rift run" />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 justify-center">
          <a
            href="https://npmjs.com/package/rift-dev"
            className="btn-primary"
          >
            <Package className="w-4 h-4 mr-2" />
            View on npm
            <ArrowRight className="w-4 h-4 ml-2" />
          </a>
          <a
            href="https://github.com/your-username/rift"
            className="px-8 py-3.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] font-medium rounded-full hover:border-[var(--text-primary)] transition-colors flex items-center gap-2"
          >
            <Github className="w-4 h-4" />
            GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
