const STATS = [
  { value: "16", label: "Frameworks Detected" },
  { value: "7", label: "Dependencies" },
  { value: "<300ms", label: "Cold Start" },
  { value: "0", label: "Config Required" },
];

export default function Stats() {
  return (
    <section className="py-12 px-6 md:px-10">
      <div className="max-w-[1000px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] font-mono tracking-tight mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-[var(--text-secondary)]">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
