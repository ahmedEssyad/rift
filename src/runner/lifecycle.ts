import { resolve } from "node:path";
import { execaCommand } from "execa";
import type { ResultPromise } from "execa";
import type { Service } from "../config/schema.js";
import { createLineBuffer, type Logger } from "./logger.js";
import { writePidFile, cleanPidFile, type PidEntry } from "./index.js";
import { waitForPort } from "./ports.js";

export interface ManagedProcess {
  name: string;
  pid: number;
  port?: number;
  startedAt: Date;
  process: ResultPromise;
  restartCount: number;
  maxRestarts: number;
  service: Service;
}

export interface StartOptions {
  maxRestarts?: number;
}

export function calculateBackoff(restartCount: number): number {
  return Math.pow(2, restartCount) * 1000;
}

export function resolveDependencyOrder(services: Service[]): Service[] {
  const nameMap = new Map(services.map((s) => [s.name, s]));
  const inDegree = new Map<string, number>();
  const graph = new Map<string, string[]>();

  for (const s of services) {
    inDegree.set(s.name, 0);
    graph.set(s.name, []);
  }
  for (const s of services) {
    for (const dep of s.depends_on ?? []) {
      if (nameMap.has(dep)) {
        graph.get(dep)!.push(s.name);
        inDegree.set(s.name, (inDegree.get(s.name) ?? 0) + 1);
      }
    }
  }

  const queue: string[] = [];
  for (const [name, deg] of inDegree) {
    if (deg === 0) queue.push(name);
  }

  const ordered: Service[] = [];
  while (queue.length > 0) {
    const name = queue.shift()!;
    ordered.push(nameMap.get(name)!);
    for (const dependent of graph.get(name) ?? []) {
      const newDeg = (inDegree.get(dependent) ?? 1) - 1;
      inDegree.set(dependent, newDeg);
      if (newDeg === 0) queue.push(dependent);
    }
  }

  if (ordered.length !== services.length) {
    throw new Error("circular dependency detected between services");
  }
  return ordered;
}

function toPidEntries(procs: ManagedProcess[]): PidEntry[] {
  return procs.map((p) => ({
    name: p.name, pid: p.pid, port: p.port, startedAt: p.startedAt.toISOString(),
  }));
}

export function spawnService(
  service: Service,
  root: string,
  logger: Logger,
  restartCount: number,
  maxRestarts: number,
): ManagedProcess {
  const cwd = resolve(root, service.path);
  const child = execaCommand(service.run, {
    cwd, env: { ...process.env, ...service.env },
    stdio: ["ignore", "pipe", "pipe"], reject: false,
  });

  const stdoutHandler = createLineBuffer((line) => logger.log(service.name, line));
  const stderrHandler = createLineBuffer((line) => logger.log(service.name, line));
  child.stdout?.on("data", stdoutHandler);
  child.stderr?.on("data", stderrHandler);

  return {
    name: service.name, pid: child.pid ?? 0, port: service.port,
    startedAt: new Date(), process: child, restartCount, maxRestarts, service,
  };
}

export function handleServiceExit(
  proc: ManagedProcess,
  managed: ManagedProcess[],
  root: string,
  logger: Logger,
  isStopping: () => boolean,
): void {
  if (isStopping()) return;
  proc.process.then((result) => {
    if (isStopping() || result.exitCode === 0) return;
    if (proc.restartCount < proc.maxRestarts) {
      const attempt = proc.restartCount + 1;
      const backoff = calculateBackoff(proc.restartCount);
      logger.rift(`service "${proc.name}" crashed (exit code ${result.exitCode}), restarting (${attempt}/${proc.maxRestarts})...`);
      setTimeout(() => {
        if (isStopping()) return;
        const idx = managed.indexOf(proc);
        if (idx !== -1) managed.splice(idx, 1);
        const newProc = spawnService(proc.service, root, logger, attempt, proc.maxRestarts);
        managed.push(newProc);
        handleServiceExit(newProc, managed, root, logger, isStopping);
        writePidFile(root, toPidEntries(managed));
      }, backoff);
    } else {
      logger.rift(`service "${proc.name}" crashed ${proc.maxRestarts} times, giving up`);
      logger.rift(`hint: run \`npx rift fix\` to diagnose the issue`);
    }
  });
}

export async function startServices(
  services: Service[],
  root: string,
  logger: Logger,
  options?: StartOptions,
): Promise<ManagedProcess[]> {
  const ordered = resolveDependencyOrder(services);
  const managed: ManagedProcess[] = [];
  const globalMaxRestarts = options?.maxRestarts ?? 3;
  let stopped = false;
  const isStopping = () => stopped;

  for (const service of ordered) {
    const portStr = service.port !== undefined ? ` (port ${service.port})` : "";
    logger.rift(`starting ${service.name}${portStr}...`);

    const maxRestarts = service.restart ?? globalMaxRestarts;
    const proc = spawnService(service, root, logger, 0, maxRestarts);
    if (proc.pid === 0) {
      stopped = true;
      for (const p of managed) {
        try { process.kill(p.pid, "SIGTERM"); } catch { /* already dead */ }
      }
      cleanPidFile(root);
      throw new Error(`failed to spawn service "${service.name}"`);
    }

    managed.push(proc);
    handleServiceExit(proc, managed, root, logger, isStopping);

    if (service.port !== undefined) {
      const hasDependents = ordered.some((s) => s.depends_on?.includes(service.name));
      if (hasDependents) {
        await waitForPort(service.port);
      }
    }
  }

  writePidFile(root, toPidEntries(managed));
  return managed;
}

export async function startAll(
  services: Service[],
  root: string,
  logger: Logger,
  options?: StartOptions,
): Promise<void> {
  const managed = await startServices(services, root, logger, options);
  let stopping = false;

  async function stopAll(): Promise<void> {
    if (stopping) return;
    stopping = true;
    logger.rift("stopping all services...");
    for (const proc of managed) {
      try { process.kill(proc.pid, "SIGTERM"); } catch { /* already dead */ }
    }
    await Promise.allSettled(
      managed.map((p) => Promise.race([p.process.catch(() => {}), new Promise((r) => setTimeout(r, 5000))]))
    );
    for (const proc of managed) {
      try { process.kill(proc.pid, "SIGKILL"); } catch { /* already dead */ }
    }
    cleanPidFile(root);
    logger.rift("all services stopped");
  }

  function handleSignal(signal: NodeJS.Signals): void {
    stopAll().then(() => process.exit(signal === "SIGINT" ? 130 : 143));
  }
  process.on("SIGINT", handleSignal);
  process.on("SIGTERM", handleSignal);

  while (!stopping) {
    await Promise.allSettled(managed.map((p) => p.process.catch(() => {})));
    const allDone = managed.every((p) => {
      try { process.kill(p.pid, 0); return false; } catch { return true; }
    });
    if (allDone) break;
  }

  if (!stopping) { cleanPidFile(root); logger.rift("all services exited"); }
}
