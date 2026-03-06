import { describe, test, expect, mock, beforeEach } from "bun:test";
import { resolve } from "node:path";
import type { Service } from "../../src/config/schema.js";

const FIXTURES = resolve(import.meta.dir, "fixtures");

// Mock the @anthropic-ai/sdk module
const mockCreate = mock(() => Promise.resolve({
  content: [
    {
      type: "tool_use",
      name: "detect_services",
      input: {
        services: [
          {
            name: "api",
            path: "./backend",
            framework: "django",
            run: "python manage.py runserver",
            port: 8000,
          },
          {
            name: "frontend",
            path: "./frontend",
            framework: "nextjs",
            run: "npm run dev",
            port: 3000,
            depends_on: ["api"],
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

// Import after mocking
const { detectWithAI } = await import("../../src/detect/ai.js");
const { detect } = await import("../../src/detect/index.js");

describe("AI detection", () => {
  beforeEach(() => {
    mockCreate.mockClear();
  });

  test("returns parsed services from tool_use response", async () => {
    const services = await detectWithAI(resolve(FIXTURES, "monorepo"), "test-key");

    expect(services.length).toBe(2);
    expect(services[0].name).toBe("api");
    expect(services[0].framework).toBe("django");
    expect(services[0].port).toBe(8000);
    expect(services[1].name).toBe("frontend");
    expect(services[1].depends_on).toEqual(["api"]);
  });

  test("sends project files and tree in prompt", async () => {
    await detectWithAI(resolve(FIXTURES, "monorepo"), "test-key");

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const call = mockCreate.mock.calls[0][0];

    expect(call.model).toBe("claude-haiku-4-5-20251001");
    expect(call.tool_choice).toEqual({ type: "tool", name: "detect_services" });
    expect(call.tools.length).toBe(1);
    expect(call.tools[0].name).toBe("detect_services");

    // Prompt should contain file tree info
    const prompt = call.messages[0].content;
    expect(prompt).toContain("File tree:");
    expect(prompt).toContain("detect_services");
  });

  test("uses max_tokens of 1024", async () => {
    await detectWithAI(resolve(FIXTURES, "monorepo"), "test-key");

    const call = mockCreate.mock.calls[0][0];
    expect(call.max_tokens).toBe(1024);
  });

  test("throws when AI returns no tool_use", async () => {
    mockCreate.mockImplementationOnce(() => Promise.resolve({
      content: [{ type: "text", text: "I couldn't detect any services" }],
    }));

    expect(detectWithAI(resolve(FIXTURES, "monorepo"), "test-key"))
      .rejects.toThrow("AI did not return a tool_use response");
  });

  test("propagates API errors", async () => {
    mockCreate.mockImplementationOnce(() => Promise.reject(new Error("API rate limit")));

    expect(detectWithAI(resolve(FIXTURES, "monorepo"), "test-key"))
      .rejects.toThrow("API rate limit");
  });

  test("preserves optional fields from AI response", async () => {
    mockCreate.mockImplementationOnce(() => Promise.resolve({
      content: [{
        type: "tool_use",
        name: "detect_services",
        input: {
          services: [{
            name: "worker",
            path: "./worker",
            framework: "express",
            run: "npm start",
            build: "npm run build",
            test: "npm test",
            install: "npm install",
            port: 4000,
          }],
        },
      }],
    }));

    const services = await detectWithAI(resolve(FIXTURES, "monorepo"), "test-key");
    expect(services[0].build).toBe("npm run build");
    expect(services[0].test).toBe("npm test");
    expect(services[0].install).toBe("npm install");
  });
});

describe("detect() orchestrator", () => {
  beforeEach(() => {
    mockCreate.mockClear();
    // Reset to default successful response
    mockCreate.mockImplementation(() => Promise.resolve({
      content: [{
        type: "tool_use",
        name: "detect_services",
        input: {
          services: [{
            name: "api",
            path: "./backend",
            framework: "django",
            run: "python manage.py runserver",
            port: 8000,
          }],
        },
      }],
    }));
  });

  test("uses AI when api key is provided", async () => {
    const services = await detect(resolve(FIXTURES, "monorepo"), "test-key");

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(services[0].framework).toBe("django");
  });

  test("falls back to rules when AI fails", async () => {
    mockCreate.mockImplementation(() => Promise.reject(new Error("network error")));

    const services = await detect(resolve(FIXTURES, "monorepo"), "test-key");

    // Should get rule-based detection results (express + nextjs from monorepo fixture)
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(services.length).toBe(2);
    const frameworks = services.map((s) => s.framework).sort();
    expect(frameworks).toEqual(["express", "nextjs"]);
  });

  test("uses rules when no api key is provided", async () => {
    const services = await detect(resolve(FIXTURES, "nextjs-app"));

    expect(mockCreate).not.toHaveBeenCalled();
    expect(services[0].framework).toBe("nextjs");
  });
});
