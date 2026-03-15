import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";

// Re-export lifecycle functions
export { startAll, startServices, resolveDependencyOrder, calculateBackoff } from "./lifecycle.js";
export type { ManagedProcess, StartOptions } from "./lifecycle.js";

const RIFT_DIR = ".rift";
const PID_FILE = "pids.json";

function pidFilePath(root: string): string {
  return join(root, RIFT_DIR, PID_FILE);
}

export interface PidEntry {
  name: string;
  pid: number;
  port?: number;
  startedAt: string;
}

export function writePidFile(root: string, entries: PidEntry[]): void {
  const dir = join(root, RIFT_DIR);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(pidFilePath(root), JSON.stringify(entries, null, 2), "utf-8");
}

export function cleanPidFile(root: string): void {
  const path = pidFilePath(root);
  if (existsSync(path)) {
    try { unlinkSync(path); } catch { /* ignore */ }
  }
}

export function readPidFile(root: string): PidEntry[] {
  const path = pidFilePath(root);
  if (!existsSync(path)) return [];
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return [];
  }
}

export function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export interface StopResult {
  stopped: string[];
  alreadyStopped: string[];
}

export async function stopServices(root: string): Promise<StopResult> {
  const entries = readPidFile(root);
  const result: StopResult = { stopped: [], alreadyStopped: [] };

  if (entries.length === 0) {
    return result;
  }

  for (const entry of entries) {
    if (processAlive(entry.pid)) {
      try {
        process.kill(entry.pid, "SIGTERM");
        result.stopped.push(entry.name);
      } catch {
        // failed to stop — don't add to either list
      }
    } else {
      result.alreadyStopped.push(entry.name);
    }
  }

  cleanPidFile(root);
  return result;
}
