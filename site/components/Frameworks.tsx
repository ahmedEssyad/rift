const FRAMEWORKS = [
  { name: "Next.js", color: "#000000" },
  { name: "React", color: "#61DAFB" },
  { name: "Vue", color: "#4FC08D" },
  { name: "Nuxt", color: "#00DC82" },
  { name: "Svelte", color: "#FF3E00" },
  { name: "Angular", color: "#DD0031" },
  { name: "Express", color: "#000000" },
  { name: "Fastify", color: "#000000" },
  { name: "NestJS", color: "#E0234E" },
  { name: "Django", color: "#092E20" },
  { name: "Flask", color: "#000000" },
  { name: "FastAPI", color: "#009688" },
  { name: "Rails", color: "#CC0000" },
  { name: "Go", color: "#00ADD8" },
  { name: "Rust", color: "#DEA584" },
  { name: "SvelteKit", color: "#FF3E00" },
];

export default function Frameworks() {
  return (
    <section id="frameworks" className="py-16 md:py-24 px-6 md:px-10 border-y border-[var(--border)]">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-12 md:mb-16">
          <span className="block text-[11px] font-medium uppercase tracking-[0.15em] text-[var(--text-muted)] mb-4">
            Detection
          </span>
          <h2 className="section-title mb-4 text-[var(--text-primary)]">
            16 frameworks. <span className="text-[var(--text-muted)] font-serif italic">Zero config.</span>
          </h2>
          <p className="text-[var(--text-secondary)] max-w-lg mx-auto leading-relaxed">
            Rule-based detection for 16 frameworks. AI detection for everything else.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
          {FRAMEWORKS.map((fw, i) => (
            <div
              key={i}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 flex flex-col items-center gap-3 hover:border-[var(--text-muted)] hover:-translate-y-1 transition-all duration-300 group"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: fw.color === "#000000" ? "var(--text-primary)" : fw.color }}
              >
                {fw.name.charAt(0)}
              </div>
              <span className="text-xs font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors text-center leading-tight">
                {fw.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
