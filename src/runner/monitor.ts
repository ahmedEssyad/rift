import { execSync } from "node:child_process";
import type { Logger } from "./logger.js";

interface ResourceInfo {
  pid: number;
  cpu: number;
  memMB: number;
}

export function getResourceUsage(pids: number[]): Map<number, ResourceInfo> {
  const results = new Map<number, ResourceInfo>();
  if (pids.length === 0) return results;

  try {
    const pidList = pids.join(",");
    const output = execSync(`ps -o pid=,pcpu=,rss= -p ${pidList}`, {
      encoding: "utf-8",
      timeout: 5000,
    });

    for (const line of output.trim().split("\n")) {
      const trimmed = line.trim();
      if (trimmed.length === 0) continue;

      const parts = trimmed.split(/\s+/);
      if (parts.length < 3) continue;

      const pid = parseInt(parts[0], 10);
      const cpu = parseFloat(parts[1]);
      const rssKB = parseInt(parts[2], 10);

      if (isNaN(pid) || isNaN(cpu) || isNaN(rssKB)) continue;

      results.set(pid, {
        pid,
        cpu,
        memMB: Math.round(rssKB / 1024),
      });
    }
  } catch {
    // ps command failed — process may have exited
  }

  return results;
}

export function printResourceTable(
  services: { name: string; pid: number }[],
  logger: Logger,
): void {
  const pids = services.map((s) => s.pid);
  const usage = getResourceUsage(pids);

  logger.rift("resource usage:");

  const maxName = Math.max(...services.map((s) => s.name.length));

  for (const service of services) {
    const info = usage.get(service.pid);
    const name = service.name.padEnd(maxName);

    if (info) {
      const cpu = `cpu ${info.cpu.toFixed(1)}%`.padEnd(12);
      const mem = `mem ${info.memMB}MB`;
      logger.rift(`  ${name}  ${cpu}  ${mem}`);
    } else {
      logger.rift(`  ${name}  (not running)`);
    }
  }
}

export function parseResourceOutput(output: string): ResourceInfo[] {
  const results: ResourceInfo[] = [];

  for (const line of output.trim().split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;

    const parts = trimmed.split(/\s+/);
    if (parts.length < 3) continue;

    const pid = parseInt(parts[0], 10);
    const cpu = parseFloat(parts[1]);
    const rssKB = parseInt(parts[2], 10);

    if (isNaN(pid) || isNaN(cpu) || isNaN(rssKB)) continue;

    results.push({ pid, cpu, memMB: Math.round(rssKB / 1024) });
  }

  return results;
}
