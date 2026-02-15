import { existsSync, mkdirSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import pc from "picocolors";

type ColorFn = (s: string) => string;

const PALETTE: ColorFn[] = [pc.cyan, pc.magenta, pc.yellow, pc.green, pc.blue, pc.red];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export interface Logger {
  log(name: string, line: string): void;
  rift(message: string): void;
  error(name: string, line: string): void;
  flush(): void;
}

export interface LoggerOptions {
  logDir?: string;
}

export function createLogger(serviceNames: string[], options?: LoggerOptions): Logger {
  const maxLen = Math.max(...serviceNames.map((n) => n.length), 4);
  const pad = maxLen + 2;
  const riftPrefix = "rift".padStart(pad);

  const colorMap = new Map<string, ColorFn>();
  for (const name of serviceNames) {
    const idx = hashName(name) % PALETTE.length;
    colorMap.set(name, PALETTE[idx]);
  }

  // Set up log directory if specified
  const logDir = options?.logDir;
  if (logDir && !existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }

  // Buffer log writes to reduce disk I/O
  const logBuffers = new Map<string, string[]>();
  let flushTimer: ReturnType<typeof setInterval> | null = null;

  function appendToLog(name: string, line: string): void {
    if (!logDir) return;
    let buf = logBuffers.get(name);
    if (!buf) {
      buf = [];
      logBuffers.set(name, buf);
    }
    buf.push(line);

    // Start periodic flush if not running
    if (flushTimer === null) {
      flushTimer = setInterval(flushLogs, 1000);
    }
  }

  function flushLogs(): void {
    for (const [name, lines] of logBuffers) {
      if (lines.length === 0) continue;
      const logPath = join(logDir!, `${name}.log`);
      appendFileSync(logPath, lines.join("\n") + "\n", "utf-8");
      lines.length = 0;
    }
  }

  function getPrefix(name: string): string {
    const color = colorMap.get(name) ?? pc.white;
    return color(name.padStart(pad));
  }

  return {
    log(name: string, line: string): void {
      process.stdout.write(`${getPrefix(name)}  ${line}\n`);
      appendToLog(name, line);
    },

    rift(message: string): void {
      process.stderr.write(`${pc.dim(riftPrefix)}  ${message}\n`);
    },

    error(name: string, line: string): void {
      process.stderr.write(`${getPrefix(name)}  ${pc.red(line)}\n`);
      appendToLog(name, line);
    },

    flush(): void {
      flushLogs();
      if (flushTimer !== null) {
        clearInterval(flushTimer);
        flushTimer = null;
      }
    },
  };
}

export interface CollectingLogger extends Logger {
  getOutput(): string[];
}

export function createCollectingLogger(serviceNames: string[]): CollectingLogger {
  const lines: string[] = [];

  return {
    log(name: string, line: string): void {
      lines.push(`${name}: ${line}`);
    },
    rift(message: string): void {
      lines.push(`rift: ${message}`);
    },
    error(name: string, line: string): void {
      lines.push(`${name} [error]: ${line}`);
    },
    flush(): void {},
    getOutput(): string[] {
      return [...lines];
    },
  };
}

export function createLineBuffer(onLine: (line: string) => void): (chunk: Buffer | string) => void {
  let buffer = "";

  return function handleChunk(chunk: Buffer | string): void {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.length > 0) {
        onLine(line);
      }
    }
  };
}
