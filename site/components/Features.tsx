export default function Features() {
  return (
    <section id="features" className="py-16 md:py-24">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10">
        <div className="text-center mb-12 md:mb-16">
          <span className="block text-[11px] font-medium uppercase tracking-[0.15em] text-[var(--text-muted)] mb-4">
            What it does
          </span>
          <h2 className="section-title mb-4 text-[var(--text-primary)]">
            The boring stuff, <span className="text-[var(--text-muted)] font-serif italic">automated.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">

          {/* 1. Detection — full width */}
          <div className="sm:col-span-2 bg-[var(--surface)] rounded-3xl overflow-hidden border border-[var(--border)] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group">
            <div className="grid sm:grid-cols-2">
              <div className="h-[220px] sm:h-auto bg-[var(--background)] p-6 font-mono text-xs select-none relative overflow-hidden border-b sm:border-b-0 sm:border-r border-[var(--border)]">
                <div className="text-[var(--text-muted)] space-y-1.5 mb-5">
                  <div className="text-[var(--text-secondary)]">my-project/</div>
                  <div className="pl-4 flex items-center gap-2">
                    <span className="opacity-30">├──</span>
                    <span>backend/</span>
                    <span className="ml-auto text-[var(--text-muted)] opacity-0 group-hover:opacity-60 transition-opacity duration-500">django</span>
                  </div>
                  <div className="pl-8 opacity-50 flex items-center gap-2">
                    <span className="opacity-30">├──</span>
                    <span>manage.py</span>
                  </div>
                  <div className="pl-8 opacity-50 flex items-center gap-2">
                    <span className="opacity-30">└──</span>
                    <span>requirements.txt</span>
                  </div>
                  <div className="pl-4 flex items-center gap-2">
                    <span className="opacity-30">├──</span>
                    <span>frontend/</span>
                    <span className="ml-auto text-[var(--text-muted)] opacity-0 group-hover:opacity-60 transition-opacity duration-700">nextjs</span>
                  </div>
                  <div className="pl-8 opacity-50 flex items-center gap-2">
                    <span className="opacity-30">├──</span>
                    <span>next.config.ts</span>
                  </div>
                  <div className="pl-8 opacity-50 flex items-center gap-2">
                    <span className="opacity-30">└──</span>
                    <span>package.json</span>
                  </div>
                  <div className="pl-4 flex items-center gap-2">
                    <span className="opacity-30">└──</span>
                    <span>worker/</span>
                    <span className="ml-auto text-[var(--text-muted)] opacity-0 group-hover:opacity-60 transition-opacity duration-1000">express</span>
                  </div>
                </div>
                <div className="mt-auto bg-[var(--surface-secondary)]/50 rounded p-2 text-[var(--text-muted)] border border-[var(--border)] flex items-center gap-2">
                  <span className="text-[var(--text-secondary)]">$</span>
                  <span className="text-[var(--text-primary)]">rift init</span>
                  <span className="ml-auto text-[var(--text-muted)] text-[10px]">3 services found</span>
                </div>
              </div>
              <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
                <h3 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)] mb-3">
                  It reads your project structure.
                </h3>
                <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
                  No config files to write. Rift scans for package.json, requirements.txt, go.mod, Cargo.toml — matches file markers against 16 known frameworks, resolves the run commands, and writes rift.yml for you.
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  Set <code className="font-mono bg-[var(--surface-secondary)] px-1.5 py-0.5 rounded text-[var(--text-secondary)]">ANTHROPIC_API_KEY</code> for AI detection of non-standard setups.
                </p>
              </div>
            </div>
          </div>

          {/* 2. Port resolution */}
          <div className="bg-[var(--surface)] rounded-3xl overflow-hidden border border-[var(--border)] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group">
            <div className="h-[200px] sm:h-[220px] relative w-full border-b border-[var(--border)] p-6 flex flex-col justify-center overflow-hidden">
              <div className="relative">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="flex flex-col items-end gap-1">
                    <div className="px-3 py-1.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] text-xs font-mono text-[var(--text-primary)]">frontend</div>
                    <div className="px-3 py-1.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] text-xs font-mono text-[var(--text-secondary)]">worker</div>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-8 h-px bg-[var(--border)]" />
                    <div className="w-8 h-px bg-[var(--border)]" />
                  </div>
                  <div className="relative">
                    <div className="px-4 py-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--text-muted)]/20 text-sm font-mono text-[var(--text-primary)] font-bold">
                      :3000
                    </div>
                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--text-muted)]" />
                  </div>
                </div>
                <div className="flex justify-center my-2">
                  <svg width="20" height="24" viewBox="0 0 20 24" fill="none" className="text-[var(--text-muted)]">
                    <path d="M10 0V20M10 20L4 14M10 20L16 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="flex items-center justify-center gap-4">
                  <div className="flex flex-col items-end gap-1">
                    <div className="px-3 py-1.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] text-xs font-mono text-[var(--text-primary)]">frontend</div>
                    <div className="px-3 py-1.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] text-xs font-mono text-[var(--text-primary)]">worker</div>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-8 h-px bg-[var(--border)]" />
                    <div className="w-8 h-px bg-[var(--border)]" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="px-4 py-1.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] text-xs font-mono text-[var(--text-primary)] font-bold">:3000</div>
                    <div className="px-4 py-1.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] text-xs font-mono text-[var(--text-primary)] font-bold">:3001</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5 sm:p-6 lg:p-8">
              <h3 className="text-lg sm:text-xl font-semibold text-[var(--text-primary)] mb-2">
                Ports just work.
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Two services on :3000? Rift reassigns, rewrites the run command, and patches every .env file that references the old port.
              </p>
            </div>
          </div>

          {/* 3. Multiplexed logs */}
          <div className="bg-[var(--surface)] rounded-3xl overflow-hidden border border-[var(--border)] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group">
            <div className="h-[200px] sm:h-[220px] relative w-full border-b border-[var(--border)] bg-[#0A0A0A] p-5 font-mono text-[11px] overflow-hidden leading-[1.8] group-hover:bg-[#080808] transition-colors">
              <div className="space-y-0.5">
                <div><span className="text-gray-500 inline-block w-[72px]">api</span><span className="text-gray-600">Watching for file changes</span></div>
                <div><span className="text-gray-400 inline-block w-[72px]">frontend</span><span className="text-gray-600">ready - started on 0.0.0.0:3000</span></div>
                <div><span className="text-gray-500 inline-block w-[72px]">api</span><span className="text-gray-600">System check: </span><span className="text-gray-400">no issues</span></div>
                <div><span className="text-gray-400 inline-block w-[72px]">frontend</span><span className="text-gray-400">compiled in 1.2s</span></div>
                <div><span className="text-gray-500 inline-block w-[72px]">worker</span><span className="text-gray-600">listening on :3001</span></div>
                <div><span className="text-gray-500 inline-block w-[72px]">api</span><span className="text-gray-700">GET</span> <span className="text-gray-500">/api/users</span> <span className="text-gray-400">200</span> <span className="text-gray-700">12ms</span></div>
                <div><span className="text-gray-400 inline-block w-[72px]">frontend</span><span className="text-gray-700">GET</span> <span className="text-gray-500">/</span> <span className="text-gray-400">200</span> <span className="text-gray-700">3ms</span></div>
              </div>
              <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none" />
            </div>
            <div className="p-5 sm:p-6 lg:p-8">
              <h3 className="text-lg sm:text-xl font-semibold text-[var(--text-primary)] mb-2">
                One terminal. Every log.
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Color-coded by service. Same name always gets the same color. Press <kbd className="font-mono bg-[var(--surface-secondary)] px-1.5 py-0.5 rounded text-xs text-[var(--text-primary)]">r</kbd> for live CPU/memory stats.
              </p>
            </div>
          </div>

          {/* 4. Auto-restart */}
          <div className="bg-[var(--surface)] rounded-3xl overflow-hidden border border-[var(--border)] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group">
            <div className="h-[200px] sm:h-[220px] relative w-full border-b border-[var(--border)] p-6 flex items-center justify-center overflow-hidden">
              <div className="w-full max-w-[280px]">
                <div className="relative">
                  <div className="absolute top-0 bottom-0 left-[3px] w-px bg-[var(--border)]" />
                  <div className="space-y-3 relative">
                    <div className="flex items-center gap-3">
                      <div className="w-[7px] h-[7px] rounded-full bg-[var(--text-muted)] relative z-10 ring-4 ring-[var(--surface)]" />
                      <span className="text-xs font-mono text-[var(--text-secondary)]">crash</span>
                      <span className="ml-auto text-[10px] text-[var(--text-muted)] font-mono">exit 1</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-[7px] h-[7px] rounded-full bg-[var(--text-muted)]/60 relative z-10 ring-4 ring-[var(--surface)]" />
                      <span className="text-xs font-mono text-[var(--text-muted)]">restart 1/3</span>
                      <span className="ml-auto text-[10px] text-[var(--text-muted)] font-mono bg-[var(--surface-secondary)] px-1.5 rounded">1s</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-[7px] h-[7px] rounded-full bg-[var(--text-muted)] relative z-10 ring-4 ring-[var(--surface)]" />
                      <span className="text-xs font-mono text-[var(--text-secondary)]">crash</span>
                      <span className="ml-auto text-[10px] text-[var(--text-muted)] font-mono">exit 1</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-[7px] h-[7px] rounded-full bg-[var(--text-muted)]/60 relative z-10 ring-4 ring-[var(--surface)]" />
                      <span className="text-xs font-mono text-[var(--text-muted)]">restart 2/3</span>
                      <span className="ml-auto text-[10px] text-[var(--text-muted)] font-mono bg-[var(--surface-secondary)] px-1.5 rounded">2s</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-[7px] h-[7px] rounded-full bg-[var(--text-primary)] relative z-10 ring-4 ring-[var(--surface)]" />
                      <span className="text-xs font-mono text-[var(--text-primary)]">running</span>
                      <span className="ml-auto text-[10px] text-[var(--text-muted)] font-mono">pid 48291</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5 sm:p-6 lg:p-8">
              <h3 className="text-lg sm:text-xl font-semibold text-[var(--text-primary)] mb-2">
                Crashes are handled.
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Exponential backoff: 1s, 2s, 4s, 8s. After 3 failures, it stops and tells you to run <code className="font-mono text-[var(--text-primary)]">rift fix</code>.
              </p>
            </div>
          </div>

          {/* 5. AI diagnosis */}
          <div className="bg-[var(--surface)] rounded-3xl overflow-hidden border border-[var(--border)] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group">
            <div className="h-[200px] sm:h-[220px] relative w-full border-b border-[var(--border)] p-6 flex flex-col justify-center overflow-hidden">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--text-muted)]" />
                  <span className="text-xs font-mono font-bold text-[var(--text-primary)]">api</span>
                  <span className="text-xs text-[var(--text-muted)]">django</span>
                  <span className="ml-auto text-[9px] uppercase tracking-wider text-[var(--text-muted)] bg-[var(--surface-secondary)] px-2 py-0.5 rounded-full">crashed</span>
                </div>
                <div className="bg-[var(--surface-secondary)] rounded-xl p-4 border border-[var(--border)]">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2 font-bold">Diagnosis</div>
                  <p className="text-sm text-[var(--text-primary)] mb-3">Missing database migration. The <code className="font-mono text-xs bg-[var(--background)] px-1 rounded">auth_user</code> table does not exist.</p>
                  <div className="flex items-center gap-2 bg-[var(--background)] rounded-lg px-3 py-2 border border-[var(--border)]">
                    <span className="text-[var(--text-muted)] text-xs">fix:</span>
                    <code className="text-xs font-mono text-[var(--text-primary)]">python manage.py migrate</code>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5 sm:p-6 lg:p-8">
              <h3 className="text-lg sm:text-xl font-semibold text-[var(--text-primary)] mb-2">
                Ask it what went wrong.
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                <code className="font-mono text-[var(--text-primary)]">rift fix</code> reads crash logs, sends them to Claude, and returns a fix command you can run. Or just <code className="font-mono text-[var(--text-primary)]">--apply</code> it.
              </p>
            </div>
          </div>

          {/* 6. JSON + MCP */}
          <div className="bg-[var(--surface)] rounded-3xl overflow-hidden border border-[var(--border)] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group">
            <div className="h-[200px] sm:h-[220px] relative w-full border-b border-[var(--border)] overflow-hidden">
              <div className="h-full flex">
                <div className="w-1/2 bg-[#0A0A0A] p-4 font-mono text-[10px] leading-relaxed border-r border-[#1E1E1E]">
                  <div className="text-gray-600 mb-2">$ rift status --json</div>
                  <div className="text-gray-700 mt-3">piped to</div>
                  <div className="text-gray-500 mt-1">jq <span className="text-gray-400">&apos;.services[]&apos;</span></div>
                  <div className="mt-4 pt-3 border-t border-gray-800">
                    <div className="text-[9px] uppercase tracking-wider text-gray-700 mb-1.5">or</div>
                    <div className="text-gray-500">claude mcp add <span className="text-gray-400">rift-mcp</span></div>
                  </div>
                </div>
                <div className="w-1/2 bg-[#111] p-4 font-mono text-[10px] leading-relaxed text-gray-500 group-hover:bg-[#0E0E0E] transition-colors">
                  <div className="text-gray-700 text-[9px] uppercase tracking-wider mb-2">stdout</div>
                  <span className="text-gray-700">{"{"}</span>
                  <div className="pl-2 space-y-0.5">
                    <div><span className="text-gray-500">&quot;name&quot;</span>: <span className="text-gray-400">&quot;api&quot;</span>,</div>
                    <div><span className="text-gray-500">&quot;pid&quot;</span>: <span className="text-gray-400">12345</span>,</div>
                    <div><span className="text-gray-500">&quot;port&quot;</span>: <span className="text-gray-400">8000</span>,</div>
                    <div><span className="text-gray-500">&quot;alive&quot;</span>: <span className="text-gray-400">true</span></div>
                  </div>
                  <span className="text-gray-700">{"}"}</span>
                </div>
              </div>
            </div>
            <div className="p-5 sm:p-6 lg:p-8">
              <h3 className="text-lg sm:text-xl font-semibold text-[var(--text-primary)] mb-2">
                Built for pipes and agents.
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Every command supports <code className="font-mono text-[var(--text-primary)]">--json</code>. Ships an MCP server so Claude Code can manage your services directly.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
