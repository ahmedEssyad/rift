import { Terminal } from "lucide-react";

export default function ProblemSolution() {
  return (
    <section className="py-16 md:py-24 px-6 md:px-10">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-12 md:mb-16">
          <span className="block text-[11px] font-medium uppercase tracking-[0.15em] text-[var(--text-muted)] mb-4">
            The Problem
          </span>
          <h2 className="section-title mb-4 text-[var(--text-primary)]">
            Full-stack is <span className="text-[var(--text-muted)] italic font-serif">messy.</span>
          </h2>
          <p className="text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
            Every tool requires manual configuration. Rift doesn&#39;t.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Before */}
          <div className="bg-[var(--surface)] rounded-3xl overflow-hidden border border-[var(--border)]">
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-3">
              <span className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide bg-red-500/10 text-red-500 rounded-full">
                Before
              </span>
              <span className="text-sm text-[var(--text-secondary)]">Without rift</span>
            </div>
            <div className="p-6 font-mono text-sm space-y-3">
              <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                <Terminal className="w-4 h-4 text-[var(--text-muted)]" />
                <span>Terminal 1: <span className="text-[var(--text-primary)]">cd backend && python manage.py runserver</span></span>
              </div>
              <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                <Terminal className="w-4 h-4 text-[var(--text-muted)]" />
                <span>Terminal 2: <span className="text-[var(--text-primary)]">cd frontend && npm run dev</span></span>
              </div>
              <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                <Terminal className="w-4 h-4 text-[var(--text-muted)]" />
                <span>Terminal 3: <span className="text-[var(--text-primary)]">cd worker && node index.js</span></span>
              </div>
              <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                <Terminal className="w-4 h-4 text-[var(--text-muted)]" />
                <span>Terminal 4: <span className="text-[var(--text-primary)]">redis-server</span></span>
              </div>
              <div className="pt-3 border-t border-[var(--border)] text-[var(--text-muted)] text-xs">
                + manual port management, no auto-restart, scattered logs
              </div>
            </div>
          </div>

          {/* After */}
          <div className="bg-[var(--surface)] rounded-3xl overflow-hidden border border-[var(--accent)]/30 shadow-[0_0_30px_var(--glow-cyan)]">
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-3">
              <span className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide bg-[var(--accent)]/10 text-[var(--accent)] rounded-full">
                After
              </span>
              <span className="text-sm text-[var(--text-secondary)]">With rift</span>
            </div>
            <div className="p-6 font-mono text-sm space-y-3">
              <div className="flex items-center gap-3 text-[var(--text-primary)]">
                <Terminal className="w-4 h-4 text-[var(--accent)]" />
                <span>rift init</span>
              </div>
              <div className="flex items-center gap-3 text-[var(--text-primary)]">
                <Terminal className="w-4 h-4 text-[var(--accent)]" />
                <span>rift run</span>
              </div>
              <div className="pt-3 border-t border-[var(--border)] text-[var(--accent)] text-xs">
                auto-detected, port-resolved, color-coded, auto-restart
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
