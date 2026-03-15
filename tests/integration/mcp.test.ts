import { describe, test, expect, beforeAll, afterAll, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

let client: Client;
let transport: StdioClientTransport;

function makeTmpRoot(): string {
  const root = join(tmpdir(), `rift-mcp-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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

async function callTool(name: string, args: Record<string, unknown>): Promise<{ text: string; parsed: any; isError?: boolean }> {
  const result = await client.callTool({ name, arguments: args });
  const content = result.content as Array<{ type: string; text: string }>;
  const text = content[0].text;
  let parsed: any;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { text, parsed, isError: result.isError as boolean | undefined };
}

describe("MCP server integration", () => {
  const roots: string[] = [];

  beforeAll(async () => {
    const serverPath = join(import.meta.dir, "../../src/mcp.ts");
    transport = new StdioClientTransport({
      command: "bun",
      args: ["run", serverPath],
    });
    client = new Client({ name: "test-client", version: "1.0.0" });
    await client.connect(transport);
  }, 10000);

  afterAll(async () => {
    await client.close();
  });

  afterEach(async () => {
    for (const root of roots) {
      try {
        await callTool("rift_stop", { path: root }).catch(() => {});
        rmSync(root, { recursive: true, force: true });
      } catch { /* ignore */ }
    }
    roots.length = 0;
  });

  test("lists all 6 tools", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      "rift_detect",
      "rift_diagnose",
      "rift_fix_apply",
      "rift_start",
      "rift_status",
      "rift_stop",
    ]);
  });

  test("rift_detect finds express service and writes config", async () => {
    const root = makeTmpRoot();
    roots.push(root);
    writePackageJson(root, { express: "^4.0.0" }, { start: "node index.js" });

    const { parsed, isError } = await callTool("rift_detect", { path: root });

    expect(isError).toBeFalsy();
    expect(parsed.services.length).toBe(1);
    expect(parsed.services[0].framework).toBe("express");
    expect(existsSync(join(root, "rift.yml"))).toBe(true);
  }, 10000);

  test("rift_detect returns error for empty project", async () => {
    const root = makeTmpRoot();
    roots.push(root);

    const { isError } = await callTool("rift_detect", { path: root });
    expect(isError).toBe(true);
  }, 10000);

  test("rift_detect resolves port conflicts", async () => {
    const root = makeTmpRoot();
    roots.push(root);
    writePackageJson(join(root, "api"), { express: "^4.0.0" }, { start: "node index.js" });
    writePackageJson(join(root, "worker"), { express: "^4.0.0" }, { start: "node index.js" });

    const { parsed } = await callTool("rift_detect", { path: root });

    const ports = parsed.services.map((s: any) => s.port).sort();
    expect(ports[0]).toBe(3000);
    expect(ports[1]).toBe(3001);
    expect(parsed.portConflicts.length).toBe(1);
  }, 10000);

  test("rift_status returns empty when nothing is running", async () => {
    const root = makeTmpRoot();
    roots.push(root);

    const { parsed } = await callTool("rift_status", { path: root });

    expect(parsed.services).toEqual([]);
    expect(parsed.running).toBe(0);
  }, 10000);

  test("rift_start → rift_status → rift_stop lifecycle", async () => {
    const root = makeTmpRoot();
    roots.push(root);

    // Write rift.yml with a simple long-running process
    const configContent = `version: 1\nservices:\n  api:\n    path: .\n    framework: express\n    run: node -e "setTimeout(()=>{},30000)"\n    port: 4567\n`;
    writeFileSync(join(root, "rift.yml"), configContent);

    // Start
    const startResult = await callTool("rift_start", { path: root });
    expect(startResult.isError).toBeFalsy();
    expect(startResult.parsed.started.length).toBe(1);
    expect(startResult.parsed.started[0].name).toBe("api");
    const pid = startResult.parsed.started[0].pid;
    expect(pid).toBeGreaterThan(0);

    // Status — should show running
    const statusResult = await callTool("rift_status", { path: root });
    expect(statusResult.parsed.running).toBe(1);
    expect(statusResult.parsed.services[0].alive).toBe(true);

    // Stop
    const stopResult = await callTool("rift_stop", { path: root });
    expect(stopResult.parsed.stopped).toContain("api");

    // Verify dead
    await new Promise((r) => setTimeout(r, 500));
    const statusAfter = await callTool("rift_status", { path: root });
    expect(statusAfter.parsed.running).toBe(0);
  }, 15000);

  test("rift_stop returns alreadyStopped for dead processes", async () => {
    const root = makeTmpRoot();
    roots.push(root);

    const riftDir = join(root, ".rift");
    mkdirSync(riftDir, { recursive: true });
    writeFileSync(join(riftDir, "pids.json"), JSON.stringify([
      { name: "ghost", pid: 999999, startedAt: new Date().toISOString() },
    ]));

    const { parsed } = await callTool("rift_stop", { path: root });
    expect(parsed.alreadyStopped).toContain("ghost");
    expect(parsed.stopped.length).toBe(0);
  }, 10000);

  test("rift_diagnose returns hints for crash logs", async () => {
    const root = makeTmpRoot();
    roots.push(root);

    // Write config
    writeFileSync(join(root, "rift.yml"), `version: 1\nservices:\n  api:\n    path: .\n    framework: express\n    run: npm start\n`);

    // Write crash log
    const logDir = join(root, ".rift", "logs");
    mkdirSync(logDir, { recursive: true });
    writeFileSync(join(logDir, "api.log"), "Error: Cannot find module 'express'\nRequire stack:\n- /app/index.js\n");

    const { parsed } = await callTool("rift_diagnose", { path: root });

    expect(parsed.source).toBe("hints");
    expect(parsed.diagnoses.length).toBe(1);
    expect(parsed.diagnoses[0].service).toBe("api");
    expect(parsed.diagnoses[0].fix_command).toBe("npm install");
  }, 10000);

  test("rift_diagnose returns empty when no logs", async () => {
    const root = makeTmpRoot();
    roots.push(root);

    writeFileSync(join(root, "rift.yml"), `version: 1\nservices:\n  api:\n    path: .\n    framework: express\n    run: npm start\n`);

    const { parsed } = await callTool("rift_diagnose", { path: root });
    expect(parsed.diagnoses.length).toBe(0);
  }, 10000);

  test("rift_fix_apply returns empty when no diagnoses", async () => {
    const root = makeTmpRoot();
    roots.push(root);

    writeFileSync(join(root, "rift.yml"), `version: 1\nservices:\n  api:\n    path: .\n    framework: express\n    run: npm start\n`);

    const { parsed } = await callTool("rift_fix_apply", { path: root });
    expect(parsed.diagnoses).toEqual([]);
    expect(parsed.applied).toEqual([]);
  }, 10000);
});
