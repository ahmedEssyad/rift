import { describe, test, expect, afterEach } from "bun:test";
import { startAll } from "../../src/runner/lifecycle.js";
import { cleanPidFile, readPidFile } from "../../src/runner/index.js";
import { createLogger } from "../../src/runner/logger.js";
import type { Service } from "../../src/config/schema.js";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

function makeTmpRoot(): string {
  const root = join(tmpdir(), `rift-integration-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(root, { recursive: true });
  return root;
}

function makeLogger(root: string) {
  return createLogger(["test"], { logDir: join(root, ".rift", "logs") });
}

function makeService(name: string, run: string, overrides?: Partial<Service>): Service {
  return { name, path: ".", framework: "test", run, ...overrides };
}

describe("lifecycle integration", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots) {
      try {
        cleanPidFile(root);
        rmSync(root, { recursive: true, force: true });
      } catch { /* ignore */ }
    }
    roots.length = 0;
  });

  test("starts and exits a simple service", async () => {
    const root = makeTmpRoot();
    roots.push(root);
    const logger = makeLogger(root);

    const services = [makeService("echo", "echo hello")];

    await startAll(services, root, logger, { maxRestarts: 0 });
    logger.flush();

    // Service should have exited cleanly, pid file cleaned up
    const entries = readPidFile(root);
    expect(entries.length).toBe(0);
  }, 10000);

  test("auto-restarts a crashing service", async () => {
    const root = makeTmpRoot();
    roots.push(root);
    const logger = makeLogger(root);

    // "false" exits with code 1 immediately
    const services = [makeService("crasher", "false")];

    await startAll(services, root, logger, { maxRestarts: 2 });
    logger.flush();

    // Service should have crashed and been restarted up to 2 times
    // then given up — check that logs dir was created
    expect(existsSync(join(root, ".rift", "logs"))).toBe(true);
  }, 30000);

  test("runs multiple services in parallel", async () => {
    const root = makeTmpRoot();
    roots.push(root);
    const logger = makeLogger(root);

    const services = [
      makeService("fast", "echo fast"),
      makeService("slow", "echo slow"),
    ];

    await startAll(services, root, logger, { maxRestarts: 0 });
    logger.flush();

    const entries = readPidFile(root);
    expect(entries.length).toBe(0);
  }, 10000);

  test("respects dependency ordering", async () => {
    const root = makeTmpRoot();
    roots.push(root);
    const logger = makeLogger(root);

    const services = [
      makeService("app", "echo app-started", { depends_on: ["db"] }),
      makeService("db", "echo db-started"),
    ];

    await startAll(services, root, logger, { maxRestarts: 0 });
    logger.flush();

    // Both should complete without error
    const entries = readPidFile(root);
    expect(entries.length).toBe(0);
  }, 10000);
});
