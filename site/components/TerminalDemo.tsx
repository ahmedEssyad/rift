"use client";

import { useState, useEffect, useRef } from "react";

interface TerminalLine {
  type: "command" | "output" | "comment" | "success" | "error" | "blank" | "rift";
  content: string;
  delay?: number;
  typeSpeed?: number;
  color?: string;
}

const TERMINAL_SEQUENCES: TerminalLine[][] = [
  // Sequence 1: rift init
  [
    { type: "comment", content: "# Step 1: Detect and configure everything", delay: 500 },
    { type: "command", content: "rift init", delay: 300, typeSpeed: 40 },
    { type: "blank", content: "", delay: 600 },
    { type: "rift", content: "rift  scanning ./my-project...", delay: 200 },
    { type: "rift", content: "rift  port conflict: reassigned worker from :3000 to :3001", delay: 300, color: "var(--term-yellow)" },
    { type: "rift", content: "rift  updated frontend/.env (:3000 -> :3001)", delay: 200 },
    { type: "rift", content: "rift  detected 3 services:", delay: 200 },
    { type: "output", content: "rift    api       django    ./backend       :8000", delay: 100, color: "var(--term-cyan)" },
    { type: "output", content: "rift    frontend  nextjs    ./frontend      :3000", delay: 100, color: "var(--term-magenta)" },
    { type: "output", content: "rift    worker    express   ./worker        :3001", delay: 100, color: "var(--term-yellow)" },
    { type: "rift", content: "rift  wrote rift.yml", delay: 200 },
    { type: "blank", content: "", delay: 200 },
    { type: "success", content: "rift  run `rift run` to start all services", delay: 300 },
  ],
  // Sequence 2: rift run
  [
    { type: "comment", content: "# Step 2: Start everything with one command", delay: 500 },
    { type: "command", content: "rift run", delay: 300, typeSpeed: 40 },
    { type: "blank", content: "", delay: 600 },
    { type: "rift", content: "rift      starting api (port 8000)...", delay: 300 },
    { type: "rift", content: "rift      starting frontend (port 3000)...", delay: 200 },
    { type: "rift", content: "rift      starting worker (port 3001)...", delay: 200 },
    { type: "output", content: "api       Watching for file changes with StatReloader", delay: 400, color: "var(--term-cyan)" },
    { type: "output", content: "api       System check identified no issues.", delay: 200, color: "var(--term-cyan)" },
    { type: "output", content: "frontend  ready - started server on 0.0.0.0:3000", delay: 300, color: "var(--term-magenta)" },
    { type: "output", content: "frontend  compiled in 1.2s", delay: 200, color: "var(--term-magenta)" },
    { type: "output", content: "worker    listening on port 3001", delay: 200, color: "var(--term-yellow)" },
    { type: "output", content: "api       GET /api/users 200 12ms", delay: 500, color: "var(--term-cyan)" },
    { type: "output", content: "frontend  GET / 200 3ms", delay: 200, color: "var(--term-magenta)" },
    { type: "blank", content: "", delay: 200 },
    { type: "success", content: "all 3 services running", delay: 300 },
  ],
  // Sequence 3: rift fix
  [
    { type: "comment", content: "# When things go wrong: AI-powered diagnosis", delay: 500 },
    { type: "command", content: "rift fix", delay: 300, typeSpeed: 40 },
    { type: "blank", content: "", delay: 600 },
    { type: "rift", content: "rift  analyzing crash logs...", delay: 600 },
    { type: "blank", content: "", delay: 200 },
    { type: "output", content: "rift  api (django):", delay: 200, color: "var(--term-cyan)" },
    { type: "output", content: "rift    problem: missing database migration", delay: 200 },
    { type: "output", content: "rift    The \"auth_user\" table does not exist.", delay: 100 },
    { type: "blank", content: "", delay: 100 },
    { type: "output", content: "rift    suggested fix:", delay: 200 },
    { type: "success", content: "rift      cd ./backend && python manage.py migrate", delay: 300 },
    { type: "blank", content: "", delay: 500 },
    { type: "command", content: "rift fix --apply", delay: 300, typeSpeed: 40 },
    { type: "blank", content: "", delay: 400 },
    { type: "success", content: "rift  fixed api: python manage.py migrate", delay: 400 },
  ],
];

interface VisibleLine {
  content: string;
  type: string;
  isTyping: boolean;
  color?: string;
}

export default function TerminalDemo() {
  const [currentSequence, setCurrentSequence] = useState(0);
  const [visibleLines, setVisibleLines] = useState<VisibleLine[]>([]);
  const [isRunning, setIsRunning] = useState(true);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isRunning) return;

    let isActive = true;
    const sequence = TERMINAL_SEQUENCES[currentSequence];

    const runSequence = async () => {
      setVisibleLines([]);
      await new Promise((r) => setTimeout(r, 300));

      for (let lineIdx = 0; lineIdx < sequence.length; lineIdx++) {
        if (!isActive) return;
        const line = sequence[lineIdx];

        if (line.delay) {
          await new Promise((r) => setTimeout(r, line.delay));
        }

        if (!isActive) return;

        if (line.type === "command" && line.typeSpeed) {
          let typedContent = "";
          setVisibleLines((prev) => [...prev, { content: "", type: line.type, isTyping: true }]);

          for (const char of line.content) {
            if (!isActive) return;
            typedContent += char;
            setVisibleLines((prev) => {
              const newLines = [...prev];
              newLines[newLines.length - 1] = { content: typedContent, type: line.type, isTyping: true };
              return newLines;
            });
            await new Promise((r) => setTimeout(r, line.typeSpeed! + Math.random() * 10));
          }

          setVisibleLines((prev) => {
            const newLines = [...prev];
            newLines[newLines.length - 1] = { content: line.content, type: line.type, isTyping: false };
            return newLines;
          });

          await new Promise((r) => setTimeout(r, 400));
        } else {
          setVisibleLines((prev) => [...prev, { content: line.content, type: line.type, isTyping: false, color: line.color }]);
        }

        if (terminalRef.current) {
          terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
      }

      await new Promise((r) => setTimeout(r, 4000));

      if (!isActive) return;
      setCurrentSequence((prev) => (prev + 1) % TERMINAL_SEQUENCES.length);
    };

    runSequence();

    return () => { isActive = false; };
  }, [currentSequence, isRunning]);

  const getLineStyle = (line: VisibleLine) => {
    switch (line.type) {
      case "command": return "text-white";
      case "comment": return "text-gray-500";
      case "success": return "text-green-400";
      case "error": return "text-red-400";
      case "rift": return "text-gray-400";
      case "blank": return "";
      default: return "text-gray-300";
    }
  };

  return (
    <section id="demo" className="py-16 md:py-32 px-6 md:px-10">
      <div className="max-w-[1000px] mx-auto">
        <div className="mb-12 md:mb-20">
          <div className="flex items-center gap-3 mb-4">
            <span className="label text-[var(--text-muted)]">Live Demo</span>
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </div>
          <h2 className="section-title text-balance text-[var(--text-primary)]">
            The full <span className="text-[var(--text-muted)] italic font-serif">workflow.</span>
          </h2>
        </div>

        {/* Terminal Window */}
        <div className="bg-[#0A0A0A] rounded-[20px] shadow-2xl border border-[#262626] overflow-hidden">
          {/* Title bar */}
          <div className="flex items-center px-5 py-4 border-b border-[#1E1E1E]">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
              <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
              <div className="w-3 h-3 rounded-full bg-[#28C840]" />
            </div>
            <div className="flex-1 text-center text-xs text-gray-500 font-mono">
              ~/my-project
            </div>
            <div className="flex gap-1.5">
              {TERMINAL_SEQUENCES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setCurrentSequence(i); setIsRunning(true); }}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentSequence ? "bg-white" : "bg-gray-700 hover:bg-gray-500"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Terminal body */}
          <div ref={terminalRef} className="p-6 h-[400px] overflow-y-auto font-mono text-sm leading-relaxed">
            {visibleLines.map((line, i) => (
              <div key={i} className={`${getLineStyle(line)} ${line.type === "blank" ? "h-4" : ""}`}>
                {line.type === "command" && (
                  <span className="text-green-400 mr-2">$</span>
                )}
                <span style={line.color ? { color: line.color } : undefined}>
                  {line.content}
                </span>
                {line.isTyping && (
                  <span className="inline-block w-2 h-4 bg-white ml-0.5 animate-blink" />
                )}
              </div>
            ))}
            {visibleLines.length === 0 && (
              <div>
                <span className="text-green-400 mr-2">$</span>
                <span className="inline-block w-2 h-4 bg-white ml-0.5 animate-blink" />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
