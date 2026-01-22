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
}

export function createLogger(serviceNames: string[]): Logger {
  const maxLen = Math.max(...serviceNames.map((n) => n.length), 4);
  const pad = maxLen + 2;
  const riftPrefix = "rift".padStart(pad);

  const colorMap = new Map<string, ColorFn>();
  for (const name of serviceNames) {
    const idx = hashName(name) % PALETTE.length;
    colorMap.set(name, PALETTE[idx]);
  }

  function getPrefix(name: string): string {
    const color = colorMap.get(name) ?? pc.white;
    return color(name.padStart(pad));
  }

  return {
    log(name: string, line: string): void {
      process.stdout.write(`${getPrefix(name)}  ${line}\n`);
    },

    rift(message: string): void {
      process.stderr.write(`${pc.dim(riftPrefix)}  ${message}\n`);
    },

    error(name: string, line: string): void {
      process.stderr.write(`${getPrefix(name)}  ${pc.red(line)}\n`);
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
