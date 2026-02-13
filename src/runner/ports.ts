import { createServer, createConnection } from "node:net";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Service } from "../config/schema.js";

export function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => { server.close(() => resolve(true)); });
    server.listen(port, "127.0.0.1");
  });
}

export interface PortConflict {
  port: number;
  services: string[];
}

export function findPortConflicts(services: Service[]): PortConflict[] {
  const portMap = new Map<number, string[]>();
  for (const service of services) {
    if (service.port === undefined) continue;
    const existing = portMap.get(service.port);
    if (existing) existing.push(service.name);
    else portMap.set(service.port, [service.name]);
  }
  const conflicts: PortConflict[] = [];
  for (const [port, names] of portMap) {
    if (names.length > 1) conflicts.push({ port, services: names });
  }
  return conflicts;
}

const PORT_FLAG: Record<string, (run: string, port: number) => string> = {
  nextjs:   (run, port) => `${run} -p ${port}`,
  nuxt:     (run, port) => `${run} --port ${port}`,
  react:    (run, port) => run,
  vue:      (run, port) => `${run} --port ${port}`,
  svelte:   (run, port) => `${run} --port ${port}`,
  angular:  (run, port) => `${run} --port ${port}`,
  express:  (run, port) => run,
  fastify:  (run, port) => run,
  nestjs:   (run, port) => run,
  django:   (run, port) => `${run} ${port}`,
  flask:    (run, port) => `${run} --port ${port}`,
  fastapi:  (run, port) => `${run} --port ${port}`,
  rails:    (run, port) => `${run} -p ${port}`,
  expo:     (run, port) => `${run} --port ${port}`,
};

function updateRunCommand(service: Service, newPort: number): string {
  const updater = PORT_FLAG[service.framework];
  if (updater) return updater(service.run, newPort);
  return service.run;
}

export function resolvePortConflicts(services: Service[]): {
  services: Service[]; changes: string[]; portMap: Map<number, number[]>;
} {
  const changes: string[] = [];
  const portMap = new Map<number, number[]>();
  const usedPorts = new Set<number>();
  const resolved = services.map((s) => ({ ...s }));

  for (const service of resolved) {
    if (service.port === undefined) continue;

    if (usedPorts.has(service.port)) {
      const originalPort = service.port;
      let newPort = originalPort + 1;
      while (usedPorts.has(newPort)) newPort++;

      service.port = newPort;
      service.run = updateRunCommand(service, newPort);
      service.env = { ...service.env, PORT: String(newPort) };

      const existing = portMap.get(originalPort);
      if (existing) {
        existing.push(newPort);
      } else {
        portMap.set(originalPort, [newPort]);
      }

      changes.push(`port conflict: reassigned ${service.name} from :${originalPort} to :${newPort}`);
    }

    usedPorts.add(service.port);
  }

  return { services: resolved, changes, portMap };
}

// Scan .env* files in all service directories and update port references.
// portChanges maps original port → array of new ports it was reassigned to.
// For .env propagation we replace old port references with the last reassigned port,
// since that's the final port the service will actually use.
export function propagatePortChanges(
  root: string,
  services: Service[],
  portChanges: Map<number, number[]>,
): string[] {
  if (portChanges.size === 0) return [];

  // Flatten to old→last-new for replacement (all references to old port
  // in .env files should point to a valid new port)
  const flatChanges = new Map<number, number>();
  for (const [oldPort, newPorts] of portChanges) {
    flatChanges.set(oldPort, newPorts[newPorts.length - 1]);
  }

  const updates: string[] = [];

  for (const service of services) {
    const serviceDir = resolve(root, service.path);
    let files: string[];
    try {
      files = readdirSync(serviceDir);
    } catch {
      continue;
    }

    const envFiles = files.filter((f) => f === ".env" || f.startsWith(".env."));

    for (const envFile of envFiles) {
      const filePath = join(serviceDir, envFile);
      let content: string;
      try {
        content = readFileSync(filePath, "utf-8");
      } catch {
        continue;
      }

      let updated = content;
      for (const [oldPort, newPort] of flatChanges) {
        const pattern = new RegExp(
          `((?:localhost|127\\.0\\.0\\.1|0\\.0\\.0\\.0)):${oldPort}\\b`,
          "g",
        );

        if (pattern.test(updated)) {
          updated = updated.replace(pattern, `$1:${newPort}`);
        }
      }

      if (updated !== content) {
        writeFileSync(filePath, updated, "utf-8");
        const changedPorts = [...flatChanges.entries()]
          .filter(([oldPort]) => content.includes(`:${oldPort}`))
          .map(([oldPort, newPort]) => `:${oldPort} -> :${newPort}`)
          .join(", ");
        updates.push(`updated ${service.name}/${envFile} (${changedPorts})`);
      }
    }
  }

  return updates;
}

export function waitForPort(port: number, timeoutMs: number = 30000): Promise<void> {
  return new Promise((res, rej) => {
    const start = Date.now();
    function attempt(): void {
      const socket = createConnection({ port, host: "127.0.0.1" });
      socket.on("connect", () => { socket.destroy(); res(); });
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

export async function checkPortsAvailable(services: Service[]): Promise<{ name: string; port: number }[]> {
  const unavailable: { name: string; port: number }[] = [];
  for (const service of services) {
    if (service.port === undefined) continue;
    if (!(await isPortAvailable(service.port))) {
      unavailable.push({ name: service.name, port: service.port });
    }
  }
  return unavailable;
}
