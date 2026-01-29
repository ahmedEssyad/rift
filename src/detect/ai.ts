import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { Service } from "../config/schema.js";

const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", ".nuxt",
  "__pycache__", ".venv", "venv", "target", ".rift", "vendor",
]);

const KEY_FILES = new Set([
  "package.json", "requirements.txt", "go.mod", "Cargo.toml", "Gemfile",
  "Dockerfile", "docker-compose.yml", "docker-compose.yaml",
  "tsconfig.json", "pyproject.toml", "setup.py",
]);

function buildFileTree(root: string, maxDepth: number = 3): string[] {
  const entries: string[] = [];

  function walk(dir: string, depth: number, prefix: string): void {
    if (depth > maxDepth) return;
    try {
      const items = readdirSync(dir).sort();
      for (const item of items) {
        if (SKIP_DIRS.has(item)) continue;
        const full = join(dir, item);
        const stat = statSync(full);
        const rel = prefix + item;

        if (stat.isDirectory()) {
          entries.push(rel + "/");
          walk(full, depth + 1, rel + "/");
        } else {
          entries.push(rel);
        }
      }
    } catch { /* skip */ }
  }

  walk(root, 0, "");
  return entries;
}

function readKeyFiles(root: string, tree: string[]): Record<string, string> {
  const contents: Record<string, string> = {};
  let totalSize = 0;
  const maxSize = 50000; // ~12K tokens

  for (const path of tree) {
    if (path.endsWith("/")) continue;
    const filename = path.split("/").pop() ?? "";
    if (!KEY_FILES.has(filename)) continue;

    try {
      const content = readFileSync(join(root, path), "utf-8");
      if (totalSize + content.length > maxSize) continue;
      contents[path] = content;
      totalSize += content.length;
    } catch { /* skip */ }
  }

  return contents;
}

const TOOL_DEFINITION = {
  name: "detect_services" as const,
  description: "Report all detected services/applications in this project",
  input_schema: {
    type: "object" as const,
    properties: {
      services: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            name: { type: "string" as const, description: "Short service name (e.g. api, frontend, worker)" },
            path: { type: "string" as const, description: "Relative path from project root (e.g. ./backend)" },
            framework: { type: "string" as const, description: "Framework identifier (e.g. nextjs, django, express)" },
            run: { type: "string" as const, description: "Command to start the service in dev mode" },
            build: { type: "string" as const, description: "Build command, if applicable" },
            test: { type: "string" as const, description: "Test command, if applicable" },
            install: { type: "string" as const, description: "Dependency install command" },
            port: { type: "number" as const, description: "Default port the service runs on" },
            depends_on: {
              type: "array" as const,
              items: { type: "string" as const },
              description: "Names of services this depends on",
            },
          },
          required: ["name", "path", "framework", "run"] as const,
        },
      },
    },
    required: ["services"] as const,
  },
};

export async function detectWithAI(dir: string, apiKey: string): Promise<Service[]> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");

  const client = new Anthropic({ apiKey });
  const tree = buildFileTree(dir);
  const keyFiles = readKeyFiles(dir, tree);

  const prompt = [
    "Analyze this project structure and detect all services/applications that can be run independently.",
    "",
    "File tree:",
    "```",
    ...tree.slice(0, 500),
    "```",
    "",
    "Key file contents:",
  ];

  for (const [path, content] of Object.entries(keyFiles)) {
    prompt.push(`\n--- ${path} ---`);
    prompt.push(content);
  }

  prompt.push("");
  prompt.push("Use the detect_services tool to report your findings. For each service, determine the correct dev run command, framework, and port.");

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    tools: [TOOL_DEFINITION],
    tool_choice: { type: "tool", name: "detect_services" },
    messages: [{ role: "user", content: prompt.join("\n") }],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("AI did not return a tool_use response");
  }

  const input = toolUse.input as { services: Array<{
    name: string;
    path: string;
    framework: string;
    run: string;
    build?: string;
    test?: string;
    install?: string;
    port?: number;
    depends_on?: string[];
  }>};

  return input.services.map((s) => ({
    name: s.name,
    path: s.path,
    framework: s.framework,
    run: s.run,
    build: s.build,
    test: s.test,
    install: s.install,
    port: s.port,
    depends_on: s.depends_on,
  }));
}
