import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve, join } from "node:path";
import { createConnection } from "node:net";
import { execaCommand } from "execa";
import type { ResultPromise } from "execa";
import type { Service } from "../config/schema.js";
import { createLogger, createLineBuffer, type Logger } from "./logger.js";

interface ManagedProcess {
  name: string;
  pid: number;
  port?: number;
  startedAt: Date;
  process: ResultPromise;
}

const RIFT_DIR = ".rift";
const PID_FILE = "pids.json";

function pidFilePath(root: string): string {
  return join(root, RIFT_DIR, PID_FILE);
}

function writePidFile(root: string, processes: ManagedProcess[]): void {
  const dir = join(root, RIFT_DIR);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const data = processes.map((p) => ({
    name: p.name,
    pid: p.pid,
    port: p.port,
    startedAt: p.startedAt.toISOString(),
  }));

  writeFileSync(pidFilePath(root), JSON.stringify(data, null, 2), "utf-8");
}

function cleanPidFile(root: string): void {
  const path = pidFilePath(root);
  if (existsSync(path)) {
    try { unlinkSync(path); } catch { /* ignore */ }
  }
}

function waitForPort(port: number, timeoutMs: number = 30000): Promise<void> {
  return new Promise((res, rej) => {
    const start = Date.now();

    function attempt(): void {
      const socket = createConnection({ port, host: "127.0.0.1" });

      socket.on("connect", () => {
        socket.destroy();
        res();
      });

      socket.on("error", () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) {
          rej(new Error(`timed out waiting for port ${port}`));
        } else {
          setTimeout(attempt, 250);
        }
      });
    }

    attempt();
  });
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
    console.error("rift  error: circular dependency detected between services");
    process.exit(1);
  }

  return ordered;
}

export async function startAll(
  services: Service[],
  root: string,
  logger: Logger,
): Promise<void> {
  const ordered = resolveDependencyOrder(services);
  const managed: ManagedProcess[] = [];
  let stopping = false;

  async function stopAll(): Promise<void> {
    if (stopping) return;
    stopping = true;

    logger.rift("stopping all services...");

    for (const proc of managed) {
      try {
        process.kill(proc.pid, "SIGTERM");
      } catch { /* already dead */ }
    }

    // Wait up to 5 seconds for graceful shutdown
    await Promise.allSettled(
      managed.map((p) =>
        Promise.race([
          p.process.catch(() => {}),
          new Promise((r) => setTimeout(r, 5000)),
        ])
      ),
    );

    // Force kill any remaining
    for (const proc of managed) {
      try {
        process.kill(proc.pid, "SIGKILL");
      } catch { /* already dead */ }
    }

    cleanPidFile(root);
    logger.rift("all services stopped");
  }

  function handleSignal(signal: NodeJS.Signals): void {
    stopAll().then(() => process.exit(signal === "SIGINT" ? 130 : 143));
  }

  process.on("SIGINT", handleSignal);
  process.on("SIGTERM", handleSignal);

  for (const service of ordered) {
    if (stopping) break;

    const portStr = service.port !== undefined ? ` (port ${service.port})` : "";
    logger.rift(`starting ${service.name}${portStr}...`);

    const cwd = resolve(root, service.path);
    const child = execaCommand(service.run, {
      cwd,
      env: { ...process.env, ...service.env },
      stdio: ["ignore", "pipe", "pipe"],
      reject: false,
    });

    if (child.pid === undefined) {
      logger.rift(`error: failed to start ${service.name}`);
      await stopAll();
      process.exit(1);
    }

    const stdoutHandler = createLineBuffer((line) => logger.log(service.name, line));
    const stderrHandler = createLineBuffer((line) => logger.log(service.name, line));

    child.stdout?.on("data", stdoutHandler);
    child.stderr?.on("data", stderrHandler);

    const proc: ManagedProcess = {
      name: service.name,
      pid: child.pid,
      port: service.port,
      startedAt: new Date(),
      process: child,
    };

    managed.push(proc);

    child.then((result) => {
      if (!stopping && result.exitCode !== 0) {
        logger.rift(`error: service "${service.name}" exited with code ${result.exitCode}`);
        if (service.port !== undefined && result.stderr?.includes("EADDRINUSE")) {
          logger.rift(`hint: port ${service.port} already in use`);
          logger.rift(`hint: run \`lsof -i :${service.port}\` to find the process`);
        }
      }
    });

    // Wait for port if this service has dependents
    if (service.port !== undefined) {
      const hasDependents = ordered.some((s) => s.depends_on?.includes(service.name));
      if (hasDependents) {
        try {
          await waitForPort(service.port);
        } catch (err) {
          logger.rift(`error: ${(err as Error).message}`);
          await stopAll();
          process.exit(1);
        }
      }
    }
  }

  writePidFile(root, managed);

  // Keep process alive until all children exit or signal received
  await Promise.allSettled(managed.map((p) => p.process.catch(() => {})));

  if (!stopping) {
    cleanPidFile(root);
    logger.rift("all services exited");
  }
}

export interface PidEntry {
  name: string;
  pid: number;
  port?: number;
  startedAt: string;
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

export async function stopServices(root: string): Promise<void> {
  const entries = readPidFile(root);
  if (entries.length === 0) {
    console.error("rift  no running services found");
    return;
  }

  for (const entry of entries) {
    if (processAlive(entry.pid)) {
      try {
        process.kill(entry.pid, "SIGTERM");
        console.error(`rift  stopped ${entry.name} (pid ${entry.pid})`);
      } catch {
        console.error(`rift  failed to stop ${entry.name} (pid ${entry.pid})`);
      }
    } else {
      console.error(`rift  ${entry.name} already stopped`);
    }
  }

  cleanPidFile(root);
}
