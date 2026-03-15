"use client";

import { Github } from "lucide-react";
import CopyButton from "./CopyButton";

export default function Hero() {
  return (
    <section className="min-h-[70vh] flex items-center pt-32 pb-16 px-6 md:px-10 relative overflow-hidden">
      <div className="max-w-[1400px] mx-auto w-full">
        <div className="max-w-[800px] mx-auto text-center">
          <h1 className="display-title mb-8 text-balance text-[var(--text-primary)]">
            One command.<br />
            <span className="text-[var(--text-muted)] italic font-serif font-light">Every service.</span>
          </h1>

          <p className="text-xl text-[var(--text-secondary)] leading-relaxed max-w-[540px] mx-auto mb-12">
            Zero-config multi-service runner for full-stack projects.
            Detects frameworks, resolves ports, multiplexes logs.
          </p>

          <div className="flex flex-wrap gap-4 justify-center items-center">
            <div className="flex items-center bg-[var(--surface)] border border-[var(--border)] rounded-full pl-6 pr-2 py-2 gap-3 hover:border-[var(--text-muted)] transition-colors">
              <code className="text-sm font-mono text-[var(--text-primary)]">npm i -g rift-dev && rift init</code>
              <CopyButton text="npm install -g rift-dev && rift init" />
            </div>
            <a href="https://github.com/your-username/rift" className="px-8 py-3.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] font-medium rounded-full hover:border-[var(--text-primary)] transition-colors flex items-center gap-2">
              <Github className="w-4 h-4" />
              View on GitHub
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
