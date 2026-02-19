import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Mock the @anthropic-ai/sdk module
const mockCreate = mock(() => Promise.resolve({
  content: [
    {
      type: "tool_use",
      name: "diagnose_crashes",
      input: {
        diagnoses: [
          {
            service: "api",
            problem: "missing database migration",
            explanation: "The auth_user table does not exist. Django requires running migrations.",
            fix_command: "cd ./backend && python manage.py migrate",
          },
        ],
      },
    },
  ],
}));

mock.module("@anthropic-ai/sdk", () => ({
  default: class Anthropic {
    messages = { create: mockCreate };
  },
}));

const { diagnoseWithAI } = await import("../../src/fix/ai.js");

function makeTmpRoot(): string {
  const root = join(tmpdir(), `rift-fix-ai-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(root, { recursive: true });
  return root;
}

describe("AI diagnosis", () => {
  const roots: string[] = [];

  beforeEach(() => {
    mockCreate.mockClear();
  });

  afterEach(() => {
    for (const root of roots) {
      try { rmSync(root, { recursive: true, force: true }); } catch { /* ignore */ }
    }
    roots.length = 0;
  });

  test("returns structured diagnosis from tool_use response", async () => {
    const root = makeTmpRoot();
    roots.push(root);

    const results = await diagnoseWithAI(root, "test-key", [
      {
        name: "api",
        framework: "django",
        path: "./backend",
        run: "python manage.py runserver",
        logContent: "django.db.utils.OperationalError: no such table: auth_user",
      },
    ]);

    expect(results.length).toBe(1);
    expect(results[0].service).toBe("api");
    expect(results[0].problem).toBe("missing database migration");
    expect(results[0].fix_command).toBe("cd ./backend && python manage.py migrate");
  });

  test("sends log content and service metadata in prompt", async () => {
    const root = makeTmpRoot();
    roots.push(root);

    await diagnoseWithAI(root, "test-key", [
      {
        name: "worker",
        framework: "express",
        path: "./worker",
        run: "npm start",
        logContent: "Error: Cannot find module 'redis'",
      },
    ]);

    const call = mockCreate.mock.calls[0][0];
    expect(call.model).toBe("claude-haiku-4-5-20251001");
    expect(call.tool_choice).toEqual({ type: "tool", name: "diagnose_crashes" });

    const prompt = call.messages[0].content;
    expect(prompt).toContain("worker");
    expect(prompt).toContain("express");
    expect(prompt).toContain("Cannot find module 'redis'");
  });

  test("includes project files when they exist", async () => {
    const root = makeTmpRoot();
    roots.push(root);
    const svcDir = join(root, "backend");
    mkdirSync(svcDir, { recursive: true });
    writeFileSync(join(svcDir, "package.json"), '{"name":"test","dependencies":{"express":"^4"}}');

    await diagnoseWithAI(root, "test-key", [
      {
        name: "api",
        framework: "express",
        path: "./backend",
        run: "npm start",
        logContent: "Error: Cannot find module 'express'",
      },
    ]);

    const prompt = mockCreate.mock.calls[0][0].messages[0].content;
    expect(prompt).toContain("package.json");
    expect(prompt).toContain("express");
  });

  test("throws when AI returns no tool_use", async () => {
    const root = makeTmpRoot();
    roots.push(root);

    mockCreate.mockImplementationOnce(() => Promise.resolve({
      content: [{ type: "text", text: "Something went wrong" }],
    }));

    expect(diagnoseWithAI(root, "test-key", [
      { name: "api", framework: "django", path: ".", run: "test", logContent: "error" },
    ])).rejects.toThrow("AI did not return a tool_use response");
  });

  test("handles multiple service diagnoses", async () => {
    const root = makeTmpRoot();
    roots.push(root);

    mockCreate.mockImplementationOnce(() => Promise.resolve({
      content: [{
        type: "tool_use",
        name: "diagnose_crashes",
        input: {
          diagnoses: [
            { service: "api", problem: "missing module", explanation: "express not installed" },
            { service: "worker", problem: "port in use", explanation: "port 3000 is taken" },
          ],
        },
      }],
    }));

    const results = await diagnoseWithAI(root, "test-key", [
      { name: "api", framework: "express", path: ".", run: "npm start", logContent: "MODULE_NOT_FOUND" },
      { name: "worker", framework: "express", path: ".", run: "npm start", logContent: "EADDRINUSE" },
    ]);

    expect(results.length).toBe(2);
    expect(results[0].service).toBe("api");
    expect(results[1].service).toBe("worker");
  });

  test("diagnosis without fix_command is valid", async () => {
    const root = makeTmpRoot();
    roots.push(root);

    mockCreate.mockImplementationOnce(() => Promise.resolve({
      content: [{
        type: "tool_use",
        name: "diagnose_crashes",
        input: {
          diagnoses: [
            { service: "api", problem: "unknown crash", explanation: "service exited unexpectedly" },
          ],
        },
      }],
    }));

    const results = await diagnoseWithAI(root, "test-key", [
      { name: "api", framework: "express", path: ".", run: "npm start", logContent: "segfault" },
    ]);

    expect(results[0].fix_command).toBeUndefined();
  });
});
