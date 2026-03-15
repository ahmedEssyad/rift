export default function Footer() {
  return (
    <footer className="max-w-[1400px] mx-auto px-6 md:px-10 py-12 flex flex-col md:flex-row justify-between items-center text-sm text-[var(--text-muted)] border-t border-[var(--border)]">
      <div className="flex items-center gap-2">
        <span className="font-mono font-bold text-[var(--text-primary)]">rift</span>
        <span>- Zero-config multi-service runner</span>
      </div>
      <div className="flex gap-6 mt-4 md:mt-0">
        <a href="/blog/building-rift" className="hover:text-[var(--text-primary)] transition-colors">Blog</a>
        <a href="https://npmjs.com/package/rift-dev" className="hover:text-[var(--text-primary)] transition-colors">npm</a>
        <a href="https://github.com/your-username/rift" className="hover:text-[var(--text-primary)] transition-colors">GitHub</a>
      </div>
    </footer>
  );
}
