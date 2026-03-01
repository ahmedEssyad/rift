import { describe, test, expect, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { detectServices } from "../../src/detect/rules.js";
import { writeConfig } from "../../src/config/writer.js";
import { readConfig } from "../../src/config/reader.js";
import { resolvePortConflicts, propagatePortChanges } from "../../src/runner/ports.js";
import { startServices } from "../../src/runner/lifecycle.js";
import { readPidFile, processAlive, stopServices, cleanPidFile } from "../../src/runner/index.js";
import { createCollectingLogger } from "../../src/runner/logger.js";
import { diagnose } from "../../src/fix/index.js";

function makeTmpRoot(): string {
  const root = join(tmpdir(), `rift-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(root, { recursive: true });
  return root;
}

function writePackageJson(dir: string, deps: Record<string, string>, scripts?: Record<string, string>): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "package.json"), JSON.stringify({
    name: "test-svc",
    dependencies: deps,
    scripts: scripts ?? {},
  }));
}

describe("init → run → stop lifecycle", () => {
  const roots: string[] = [];

  afterEach(async () => {
    for (const root of roots) {
      try {
        await stopServices(root).catch(() => {});
        cleanPidFile(root);
        rmSync(root, { recursive: true, force: true });
      } catch { /* ignore */ }
    }
    roots.length = 0;
  });

  test("detect → write config → read config → start → stop", async () => {
    const root = makeTmpRoot();
    roots.push(root);

    // Create a fake express service
    writePackageJson(root, { express: "^4.0.0" }, { start: "node -e \"setTimeout(()=>{},5000)\"" });

    // 1. Detect
    const services = detectServices(root);
    expect(services.length).toBe(1);
    expect(services[0].framework).toBe("express");

    // 2. Resolve ports + write config
    const { services: resolved } = resolvePortConflicts(services);
    const configPath = join(root, "rift.yml");
    writeConfig(configPath, resolved);
    expect(existsSync(configPath)).toBe(true);

    // 3. Read config back
    const config = readConfig(configPath);
    expect(config.services.length).toBe(1);
    expect(config.services[0].framework).toBe("express");

    // 4. Start services (non-blocking)
    // Override run command to something that actually works without express
    config.services[0].run = "node -e \"setTimeout(()=>{},5000)\"";
    const logger = createCollectingLogger(config.services.map((s) => s.name));
    const managed = await startServices(config.services, root, logger);

    expect(managed.length).toBe(1);
    expect(managed[0].pid).toBeGreaterThan(0);
    expect(processAlive(managed[0].pid)).toBe(true);

    // 5. Verify PID file
    const entries = readPidFile(root);
    expect(entries.length).toBe(1);
    expect(entries[0].name).toBe(managed[0].name);

    // 6. Stop
    const result = await stopServices(root);
    expect(result.stopped.length).toBe(1);

    // Give process time to die
    await new Promise((r) => setTimeout(r, 500));
    expect(processAlive(managed[0].pid)).toBe(false);
  }, 15000);

  test("multi-service with port conflict resolution", async () => {
    const root = makeTmpRoot();
    roots.push(root);

    // Two services on the same port
    const svc1Dir = join(root, "api");
    const svc2Dir = join(root, "worker");
    writePackageJson(svc1Dir, { express: "^4.0.0" }, { start: "node index.js" });
    writePackageJson(svc2Dir, { express: "^4.0.0" }, { start: "node index.js" });

    const services = detectServices(root);
    expect(services.length).toBe(2);

    // Both default to port 3000 — should resolve
    const { services: resolved, changes } = resolvePortConflicts(services);
    const ports = resolved.map((s) => s.port).sort();
    expect(ports[0]).toBe(3000);
    expect(ports[1]).toBe(3001);
    expect(changes.length).toBe(1);
  }, 10000);

  test("port propagation updates .env files", async () => {
    const root = makeTmpRoot();
    roots.push(root);

    const frontendDir = join(root, "frontend");
    const apiDir = join(root, "api");
    writePackageJson(frontendDir, { next: "^14.0.0" });
    writePackageJson(apiDir, { express: "^4.0.0" }, { start: "node index.js" });

    // Frontend .env references api on :3000
    writeFileSync(join(frontendDir, ".env"), "API_URL=http://localhost:3000/api\n");

    // next.config.js so nextjs is detected
    writeFileSync(join(frontendDir, "next.config.js"), "module.exports = {}");

    const services = detectServices(root);
    const { services: resolved, portMap } = resolvePortConflicts(services);

    const envUpdates = propagatePortChanges(root, resolved, portMap);

    // If there was a port conflict (both on 3000), .env should be updated
    if (portMap.size > 0) {
      const envContent = readFileSync(join(frontendDir, ".env"), "utf-8");
      expect(envContent).not.toContain("localhost:3000");
      expect(envUpdates.length).toBeGreaterThan(0);
    }
  }, 10000);

  test("diagnose returns empty when no logs exist", async () => {
    const root = makeTmpRoot();
    roots.push(root);

    const configPath = join(root, "rift.yml");
    writeConfig(configPath, [
      { name: "api", path: ".", framework: "express", run: "npm start" },
    ]);

    const result = await diagnose(configPath, root);
    expect(result.diagnoses.length).toBe(0);
  }, 5000);

  test("diagnose reads crash logs and returns hints", async () => {
    const root = makeTmpRoot();
    roots.push(root);

    // Write config
    const configPath = join(root, "rift.yml");
    writeConfig(configPath, [
      { name: "api", path: ".", framework: "express", run: "npm start" },
    ]);

    // Write a crash log
    const logDir = join(root, ".rift", "logs");
    mkdirSync(logDir, { recursive: true });
    writeFileSync(join(logDir, "api.log"), "Error: Cannot find module 'express'\nRequire stack:\n- /app/index.js\n");

    const result = await diagnose(configPath, root);
    expect(result.source).toBe("hints");
    expect(result.diagnoses.length).toBe(1);
    expect(result.diagnoses[0].service).toBe("api");
    expect(result.diagnoses[0].problem).toBe("missing dependency");
    expect(result.diagnoses[0].fix_command).toBe("npm install");
  }, 5000);

  test("stop returns alreadyStopped for dead processes", async () => {
    const root = makeTmpRoot();
    roots.push(root);

    // Write a PID file with a PID that doesn't exist
    const riftDir = join(root, ".rift");
    mkdirSync(riftDir, { recursive: true });
    writeFileSync(join(riftDir, "pids.json"), JSON.stringify([
      { name: "ghost", pid: 999999, startedAt: new Date().toISOString() },
    ]));

    const result = await stopServices(root);
    expect(result.alreadyStopped).toContain("ghost");
    expect(result.stopped.length).toBe(0);
  }, 5000);
});
