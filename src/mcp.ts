#!/usr/bin/env node
import { resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { detect } from "./detect/index.js";
import { readConfig } from "./config/reader.js";
import { writeConfig } from "./config/writer.js";
import { diagnose } from "./fix/index.js";
import { applyFixes } from "./fix/apply.js";
import { createCollectingLogger } from "./runner/logger.js";
import { startServices, readPidFile, processAlive, stopServices } from "./runner/index.js";
import { resolvePortConflicts, propagatePortChanges } from "./runner/ports.js";

const server = new McpServer(
  { name: "rift", version: "0.2.0" },
  { capabilities: { tools: {} } },
);

// Track spawned child PIDs for cleanup
const spawnedPids: number[] = [];

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function err(message: string) {
  return { isError: true, content: [{ type: "text" as const, text: message }] };
}

server.tool(
  "rift_detect",
  "Scan a project directory, detect frameworks/services, resolve port conflicts, and write rift.yml",
  { path: z.string().describe("Absolute path to the project root directory") },
  async ({ path: projectPath }) => {
    try {
      const dir = resolve(projectPath);
      const configPath = resolve(dir, "rift.yml");

      const services = await detect(dir);
      if (services.length === 0) {
        return err("no services detected in " + dir);
      }

      const { services: resolved, changes, portMap } = resolvePortConflicts(services);
      const envUpdates = propagatePortChanges(dir, resolved, portMap);
      writeConfig(configPath, resolved);

      return ok({
        services: resolved,
        portConflicts: changes,
        envUpdates,
        configPath,
      });
    } catch (e) {
      return err((e as Error).message);
    }
  },
);

server.tool(
  "rift_status",
  "Show status of running services in a project",
  { path: z.string().describe("Absolute path to the project root directory") },
  async ({ path: projectPath }) => {
    try {
      const root = resolve(projectPath);
      const entries = readPidFile(root);
      const services = entries.map((e) => ({
        name: e.name,
        pid: e.pid,
        port: e.port,
        startedAt: e.startedAt,
        alive: processAlive(e.pid),
      }));
      const running = services.filter((s) => s.alive).length;

      return ok({ services, running });
    } catch (e) {
      return err((e as Error).message);
    }
  },
);

server.tool(
  "rift_start",
  "Start all services defined in rift.yml. Services persist via PID file — use rift_stop to terminate, or they will be killed when MCP session ends.",
  { path: z.string().describe("Absolute path to the project root directory") },
  async ({ path: projectPath }) => {
    try {
      const root = resolve(projectPath);
      const configPath = resolve(root, "rift.yml");
      const config = readConfig(configPath);

      const logger = createCollectingLogger(config.services.map((s) => s.name));
      const managed = await startServices(config.services, root, logger);

      for (const proc of managed) {
        spawnedPids.push(proc.pid);
      }

      return ok({
        started: managed.map((p) => ({
          name: p.name,
          pid: p.pid,
          port: p.port,
        })),
        output: logger.getOutput(),
        note: "services persist via PID file. use rift_stop to terminate, or they will be killed when MCP session ends",
      });
    } catch (e) {
      return err((e as Error).message);
    }
  },
);

server.tool(
  "rift_stop",
  "Stop all running services in a project",
  { path: z.string().describe("Absolute path to the project root directory") },
  async ({ path: projectPath }) => {
    try {
      const root = resolve(projectPath);
      const result = await stopServices(root);
      return ok(result);
    } catch (e) {
      return err((e as Error).message);
    }
  },
);

server.tool(
  "rift_diagnose",
  "Read crash logs and diagnose service failures",
  { path: z.string().describe("Absolute path to the project root directory") },
  async ({ path: projectPath }) => {
    try {
      const root = resolve(projectPath);
      const configPath = resolve(root, "rift.yml");
      const result = await diagnose(configPath, root);
      return ok(result);
    } catch (e) {
      return err((e as Error).message);
    }
  },
);

server.tool(
  "rift_fix_apply",
  "Diagnose service failures and execute suggested fix commands",
  { path: z.string().describe("Absolute path to the project root directory") },
  async ({ path: projectPath }) => {
    try {
      const root = resolve(projectPath);
      const configPath = resolve(root, "rift.yml");
      const result = await diagnose(configPath, root);

      if (result.diagnoses.length === 0) {
        return ok({ diagnoses: [], applied: [] });
      }

      const applied = await applyFixes(result.diagnoses, root, configPath);
      return ok({ ...result, applied });
    } catch (e) {
      return err((e as Error).message);
    }
  },
);

// Clean up spawned children on exit
process.on("exit", () => {
  for (const pid of spawnedPids) {
    try { process.kill(pid, "SIGTERM"); } catch { /* already dead */ }
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error("rift-mcp failed to start:", e);
  process.exit(1);
});
