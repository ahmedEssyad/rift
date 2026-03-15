import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Building rift — Decisions, trade-offs, and the why behind everything",
  description: "A deep dive into how rift was built: the architecture decisions, dependency choices, detection strategy, and design philosophy behind a zero-config multi-service runner.",
};

export default function BlogPost() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      {/* Nav */}
      <header className="max-w-[720px] mx-auto px-6 pt-10 pb-16">
        <Link
          href="/"
          className="text-[14px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors font-mono"
        >
          &larr; rift
        </Link>
      </header>

      <article className="max-w-[720px] mx-auto px-6 pb-24">
        {/* Title block */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <time className="text-[12px] uppercase tracking-[0.15em] text-[var(--text-muted)] font-medium">
              March 2026
            </time>
            <span className="text-[var(--text-muted)]">/</span>
            <span className="text-[12px] text-[var(--text-muted)]">
              <a href="https://essyad.site" className="hover:text-[var(--text-primary)] transition-colors">Ahmed Essyad</a>
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)] leading-[1.1] mb-6">
            Building rift
          </h1>
          <p className="text-lg text-[var(--text-secondary)] leading-relaxed">
            Every dev tool landing page says &ldquo;zero config.&rdquo; We actually mean it. This is the story of how rift was built, the decisions we made, and the trade-offs behind a CLI that scans your project and figures out what to run.
          </p>
        </div>

        {/* Body */}
        <div className="prose-rift space-y-8 text-[var(--text-secondary)] leading-[1.8] text-[16px]">

          <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-16 mb-4">The problem we kept hitting</h2>
          <p>
            Every full-stack project has the same startup ritual. Open a terminal for the backend. Another for the frontend. Maybe a third for a worker. A fourth if you have Redis or a queue. You remember which ports each one needs, check if something else is already using 3000, and pray you didn&rsquo;t forget to install dependencies.
          </p>
          <p>
            Tools exist for this. <code>concurrently</code> has 13 million weekly downloads. <code>docker-compose</code>, Foreman, Overmind, <code>npm-run-all</code>&mdash;they all solve the &ldquo;run multiple things&rdquo; problem. But every single one requires you to write the config first. The Procfile. The docker-compose.yml. The npm scripts. You&rsquo;re still doing the work of telling the tool what to do.
          </p>
          <p>
            Rift&rsquo;s bet is simple: your project structure already contains everything needed to figure out what to run. A <code>manage.py</code> next to a <code>requirements.txt</code> with Django in it? That&rsquo;s a Django service. A <code>next.config.ts</code> next to a <code>package.json</code> with <code>next</code> in dependencies? Next.js. The information is there. No one was reading it.
          </p>

          <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-16 mb-4">Detection: the core value</h2>
          <p>
            Detection is the product. If <code>rift init</code> produces a wrong <code>rift.yml</code>, nothing else matters. So detection gets the most engineering attention and the most test coverage.
          </p>
          <p>
            The strategy is a two-tier system: rule-based detection as the floor, AI detection as the ceiling. Rule-based covers 16 frameworks with hardcoded file markers and dependency checks. It&rsquo;s fast, deterministic, and works offline. AI detection (via Claude Haiku) handles everything else&mdash;non-standard setups, custom frameworks, monorepos with unusual structures.
          </p>
          <p>
            The critical design rule: <strong>AI enhances, it never gates.</strong> Every code path must work without an API key. If AI fails, we fall back to rules silently. The user should never see an error because they don&rsquo;t have an Anthropic key. They just get slightly less magical detection.
          </p>
          <p>
            Each framework detection is a simple check: does this directory have the right file markers? Does the package.json (or requirements.txt, or Gemfile) contain the right dependency? We intentionally never detect by directory name alone. A folder called <code>django-app</code> means nothing. A folder containing <code>manage.py</code> and a requirements file with <code>django</code> in it means everything.
          </p>

          <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-16 mb-4">Architecture: 19 files, each under 200 lines</h2>
          <p>
            The entire codebase is 19 files. We enforce a hard rule: if a file grows past 200 lines, split it. This isn&rsquo;t arbitrary. Small files force clear module boundaries. When you can&rsquo;t hide complexity inside a 600-line file, you have to actually design the interfaces between modules.
          </p>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 font-mono text-sm text-[var(--text-secondary)] my-8 overflow-x-auto">
            <pre className="whitespace-pre">{`src/
├── index.ts              # entry, shebang, nothing else
├── cli.ts                # commander setup, all commands
├── mcp.ts                # MCP server entry point
├── utils.ts              # shared helpers
├── detect/
│   ├── index.ts          # orchestrator: AI → rules fallback
│   ├── rules.ts          # hardcoded detection
│   └── ai.ts             # Claude API detection
├── runner/
│   ├── index.ts          # PID file ops, re-exports
│   ├── lifecycle.ts      # spawn, auto-restart, deps
│   ├── logger.ts         # multiplexed colored logs
│   ├── monitor.ts        # CPU/memory via ps
│   └── ports.ts          # port checks, .env propagation
├── config/
│   ├── schema.ts         # TypeScript types
│   ├── reader.ts         # parse rift.yml
│   └── writer.ts         # write rift.yml
└── fix/
    ├── index.ts          # diagnose() returns data
    ├── apply.ts          # execute fix commands
    ├── ai.ts             # AI diagnosis
    └── hints.ts          # pattern-match common errors`}</pre>
          </div>

          <p>
            The data flow is linear and predictable. <code>rift init</code> scans directories, detects frameworks, resolves port conflicts, propagates changes to .env files, and writes rift.yml. <code>rift run</code> reads rift.yml, checks ports, resolves dependency order, spawns processes, and multiplexes logs. No event emitters, no plugin systems, no middleware chains.
          </p>

          <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-16 mb-4">7 dependencies. That&rsquo;s it.</h2>
          <p>
            Adding an 8th dependency requires justification. Every one of the 7 earns its place:
          </p>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden my-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left px-5 py-3 text-[var(--text-muted)] font-medium text-xs uppercase tracking-wider">Dep</th>
                  <th className="text-left px-5 py-3 text-[var(--text-muted)] font-medium text-xs uppercase tracking-wider">Why this one</th>
                </tr>
              </thead>
              <tbody className="text-[var(--text-secondary)]">
                <tr className="border-b border-[var(--border-light)]"><td className="px-5 py-3 font-mono text-[var(--text-primary)]">commander</td><td className="px-5 py-3">Proven CLI framework. Everyone knows it.</td></tr>
                <tr className="border-b border-[var(--border-light)]"><td className="px-5 py-3 font-mono text-[var(--text-primary)]">yaml</td><td className="px-5 py-3">More spec-compliant than js-yaml.</td></tr>
                <tr className="border-b border-[var(--border-light)]"><td className="px-5 py-3 font-mono text-[var(--text-primary)]">picocolors</td><td className="px-5 py-3">2KB, zero deps. No ESM issues unlike chalk.</td></tr>
                <tr className="border-b border-[var(--border-light)]"><td className="px-5 py-3 font-mono text-[var(--text-primary)]">execa</td><td className="px-5 py-3">Better errors and API than raw child_process.</td></tr>
                <tr className="border-b border-[var(--border-light)]"><td className="px-5 py-3 font-mono text-[var(--text-primary)]">@anthropic-ai/sdk</td><td className="px-5 py-3">Official SDK. Lazy-loaded to avoid 200ms startup cost.</td></tr>
                <tr className="border-b border-[var(--border-light)]"><td className="px-5 py-3 font-mono text-[var(--text-primary)]">@modelcontextprotocol/sdk</td><td className="px-5 py-3">Required for MCP server / Claude Code integration.</td></tr>
                <tr><td className="px-5 py-3 font-mono text-[var(--text-primary)]">zod</td><td className="px-5 py-3">Required by MCP SDK for tool input schemas.</td></tr>
              </tbody>
            </table>
          </div>

          <p>
            The Anthropic SDK is the most interesting case. It costs ~200ms to import, which would blow our 300ms cold-start budget. So it&rsquo;s lazy-loaded via dynamic <code>import()</code>&mdash;only loaded when the user actually has an API key and needs AI features. Users who never set <code>ANTHROPIC_API_KEY</code> never pay the import cost.
          </p>

          <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-16 mb-4">Port conflicts: the unsexy feature that matters</h2>
          <p>
            When you have a Next.js frontend and an Express worker, they both default to port 3000. Every developer has hit this. You get <code>EADDRINUSE</code>, you Google it, you add <code>--port 3001</code> to one of them, and you move on.
          </p>
          <p>
            Rift handles this automatically during <code>rift init</code>. When two services share a default port:
          </p>
          <ol className="list-decimal pl-6 space-y-2">
            <li>The first service keeps the original port. Later services get incremented.</li>
            <li>The run command is rewritten with the right port flag (<code>-p</code> for Next.js, <code>--port</code> for Vite, positional arg for Django).</li>
            <li>A <code>PORT</code> env var is added to the service&rsquo;s config for frameworks that read <code>process.env.PORT</code>.</li>
            <li>Every <code>.env</code> file across all services is scanned for references to the old port (<code>localhost:3000</code>, <code>127.0.0.1:3000</code>) and rewritten to the new one.</li>
          </ol>
          <p>
            That last step is the one nobody else does. If your frontend&rsquo;s <code>.env</code> has <code>API_URL=http://localhost:3000/api</code> and the API moved to 3001, rift updates it. Cross-service URLs, CORS origins, WebSocket URLs&mdash;they all stay correct.
          </p>

          <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-16 mb-4">Error philosophy: throw, don&rsquo;t exit</h2>
          <p>
            Early versions of rift called <code>process.exit(1)</code> deep inside library code. This worked fine for the CLI but broke everything when we added the MCP server and <code>--json</code> mode. If a config file is invalid, the MCP server needs to catch that error and return it as a structured response, not crash the process.
          </p>
          <p>
            The rule now: library code (reader, lifecycle, detect) throws errors with human-readable messages. CLI commands catch those errors and format them for the terminal. The MCP server catches them and wraps them in <code>{"{ isError: true }"}</code>. Same error, three different presentations.
          </p>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 font-mono text-sm text-[var(--text-secondary)] my-8 overflow-x-auto">
            <pre className="whitespace-pre">{`// Library code — throws
throw new Error(\`service "\${name}" missing required field "path"\`);

// CLI — catches and prints
try {
  const config = readConfig(configPath);
} catch (err) {
  riftLog(\`error: \${(err as Error).message}\`);
  process.exit(1);
}

// MCP — catches and returns
try {
  const result = await diagnose(configPath, root);
  return { content: [{ type: "text", text: JSON.stringify(result) }] };
} catch (err) {
  return { isError: true, content: [...] };
}`}</pre>
          </div>

          <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-16 mb-4">The rift fix loop</h2>
          <p>
            Auto-restart handles transient failures. But when a service keeps crashing, you need to know why. <code>rift fix</code> reads the last 200 lines of each crashed service&rsquo;s log file and either pattern-matches common errors (10 patterns: EADDRINUSE, MODULE_NOT_FOUND, missing migrations, etc.) or sends them to Claude Haiku for diagnosis.
          </p>
          <p>
            The AI path uses <code>tool_use</code> to force structured output. We don&rsquo;t parse free-text responses. Claude returns a tool call with <code>problem</code>, <code>explanation</code>, and <code>fix_command</code> fields. The <code>fix_command</code> is what makes <code>rift fix --apply</code> possible&mdash;it executes the suggested command in the service&rsquo;s directory.
          </p>
          <p>
            The non-AI fallback isn&rsquo;t a degraded experience. Each pattern includes a <code>fix_command</code> when possible: MODULE_NOT_FOUND suggests <code>npm install</code>, Python ImportError suggests <code>pip install -r requirements.txt</code>, native module errors suggest <code>rm -rf node_modules && npm install</code>. The AI just provides better explanations for unusual errors.
          </p>

          <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-16 mb-4">Why an MCP server</h2>
          <p>
            The MCP server (<code>rift-mcp</code>) exposes 6 tools that reuse the same internal functions as the CLI: detect, status, start, stop, diagnose, fix. It means Claude Code (or any MCP client) can manage your services directly&mdash;start them, check status, diagnose failures, apply fixes&mdash;without the user touching the terminal.
          </p>
          <p>
            The key architectural decision was separating blocking from non-blocking entry points. <code>startAll()</code> blocks (waits for signal, manages the event loop)&mdash;that&rsquo;s what <code>rift run</code> uses. <code>startServices()</code> spawns processes and returns immediately&mdash;that&rsquo;s what the MCP <code>rift_start</code> tool uses. Same spawning logic, different lifecycle management.
          </p>
          <p>
            Services spawned via MCP persist independently. They survive the MCP call returning. They&rsquo;re tracked via the PID file, same as CLI mode. The MCP server registers a <code>process.on(&ldquo;exit&rdquo;)</code> handler that SIGTERMs all children spawned during the session, so nothing leaks.
          </p>

          <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-16 mb-4">Performance budget</h2>
          <p>
            We have hard thresholds. If a code change regresses past them, it&rsquo;s a bug, not a trade-off.
          </p>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden my-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left px-5 py-3 text-[var(--text-muted)] font-medium text-xs uppercase tracking-wider">Operation</th>
                  <th className="text-left px-5 py-3 text-[var(--text-muted)] font-medium text-xs uppercase tracking-wider">Budget</th>
                </tr>
              </thead>
              <tbody className="text-[var(--text-secondary)]">
                <tr className="border-b border-[var(--border-light)]"><td className="px-5 py-3 font-mono text-[var(--text-primary)]">rift run (cold, no AI)</td><td className="px-5 py-3">First spawn in &lt;300ms</td></tr>
                <tr className="border-b border-[var(--border-light)]"><td className="px-5 py-3 font-mono text-[var(--text-primary)]">rift init (with AI)</td><td className="px-5 py-3">&lt;5s including API round-trip</td></tr>
                <tr className="border-b border-[var(--border-light)]"><td className="px-5 py-3 font-mono text-[var(--text-primary)]">rift init (no AI)</td><td className="px-5 py-3">&lt;1s</td></tr>
                <tr><td className="px-5 py-3 font-mono text-[var(--text-primary)]">rift status</td><td className="px-5 py-3">&lt;100ms (JSON read + PID check)</td></tr>
              </tbody>
            </table>
          </div>

          <p>
            The 300ms cold-start budget is why the Anthropic SDK is lazy-loaded. It&rsquo;s why we use <code>picocolors</code> (2KB) instead of chalk. It&rsquo;s why there&rsquo;s no bundler&mdash;just <code>tsc</code> outputting to <code>dist/</code>. Every architectural decision is filtered through: does this make startup slower?
          </p>

          <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-16 mb-4">Design principles we actually follow</h2>
          <p>
            These aren&rsquo;t aspirational. They&rsquo;re enforced in code review.
          </p>
          <p>
            <strong>KISS.</strong> A function does one thing. If you&rsquo;re naming it <code>detectAndValidateAndWrite</code>, split it. Flat is better than nested. No classes unless you need inheritance or stateful lifecycle.
          </p>
          <p>
            <strong>YAGNI.</strong> No plugin systems. No event emitters. No middleware chains. No feature flags. Don&rsquo;t build an abstraction for something that happens once. Three similar lines of code is better than one premature helper.
          </p>
          <p>
            <strong>Explicit over clever.</strong> <code>{"const isRunning = pid !== null && processExists(pid)"}</code> instead of <code>{"const isRunning = !!pid && !!processExists(pid)"}</code>. We read code more than we write it.
          </p>
          <p>
            <strong>Validate at the boundary, trust internally.</strong> <code>readConfig()</code> validates the YAML once. Everything downstream receives a typed object and doesn&rsquo;t re-check fields. Config parsing throws on invalid input. Process spawning trusts valid input.
          </p>

          <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-16 mb-4">Building the landing page</h2>
          <p>
            The landing page is a static Next.js export deployed to GitHub Pages. We chose this over a docs framework because we wanted full control over the design&mdash;the page is the product&rsquo;s first impression, and dev tool landing pages that look like every other Docusaurus site don&rsquo;t stand out.
          </p>
          <p>
            The design system is adapted from a prior project. CSS custom properties for theming (light/dark/system), Inter + JetBrains Mono for type, a muted palette that avoids the rainbow-terminal-screenshot aesthetic. The features section went through three iterations: the first was a uniform 3-column grid with too many bright terminal colors, the second was better but still felt generated. The final version uses an asymmetric bento layout where each card has a distinct visual language&mdash;a file tree, a port diagram, a timeline, a diagnosis card, a split-pane view.
          </p>
          <p>
            The terminal demo component animates through three sequences (init, run, fix) with character-by-character typing for commands and instant rendering for output. It loops forever. Each sequence shows a different part of the workflow. The dots in the title bar let you jump between them.
          </p>
          <p>
            We kept the landing page in the same repo under <code>site/</code>. A GitHub Actions workflow builds and deploys on push. The Next.js config uses <code>output: &ldquo;export&rdquo;</code> for static generation and <code>basePath: &ldquo;/rift&rdquo;</code> for GitHub Pages routing.
          </p>

          <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-16 mb-4">What we chose not to build</h2>
          <p>
            The hardest decisions are what to leave out. Rift doesn&rsquo;t have:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Daemon mode.</strong> <code>rift run</code> holds the terminal. This is intentional&mdash;multiplexed logs are the feature. Background mode is a future milestone.</li>
            <li><strong>A TUI dashboard.</strong> Press <code>r</code> for resource usage. That&rsquo;s enough for now.</li>
            <li><strong>Watch mode.</strong> Frameworks handle their own file watching. Rift doesn&rsquo;t need to duplicate it.</li>
            <li><strong>Windows support.</strong> macOS and Linux first. Windows-specific code would add complexity to every process management function.</li>
            <li><strong>A plugin system.</strong> When there are 3+ concrete use cases demanding it, we&rsquo;ll build one. Not before.</li>
          </ul>
          <p>
            Each of these is a deliberate choice, not an oversight. The codebase stays small because we say no to things that don&rsquo;t serve the core value: you run <code>rift init</code>, it figures out your project, and <code>rift run</code> starts everything.
          </p>

          {/* Closing */}
          <div className="border-t border-[var(--border)] mt-16 pt-10 space-y-8">
            <p className="text-[var(--text-muted)] text-sm">
              Rift is open source and published as <a href="https://npmjs.com/package/rift-dev" className="text-[var(--text-secondary)] underline underline-offset-2 hover:text-[var(--text-primary)] transition-colors">rift-dev</a> on npm. Install it with <code className="font-mono bg-[var(--surface-secondary)] px-1.5 py-0.5 rounded text-[var(--text-secondary)]">npm i -g rift-dev</code>, then run <code className="font-mono bg-[var(--surface-secondary)] px-1.5 py-0.5 rounded text-[var(--text-secondary)]">rift init</code> in your project.
            </p>

            {/* Author */}
            <div className="flex items-start gap-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
              <div className="w-10 h-10 rounded-full bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-center text-sm font-bold text-[var(--text-primary)] flex-shrink-0">
                A
              </div>
              <div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  <a href="https://essyad.site" className="hover:opacity-80 transition-opacity">Ahmed Essyad</a>
                </div>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">
                  Founder of <a href="https://ider.studio" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">ider.studio</a> &middot; Co-founder of <a href="https://munkidh.com" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">munkidh.com</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}
