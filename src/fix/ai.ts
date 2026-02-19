import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

interface ServiceContext {
  name: string;
  framework: string;
  path: string;
  run: string;
  logContent: string;
}

interface AIDiagnosis {
  service: string;
  problem: string;
  explanation: string;
  fix_command?: string;
}

const TOOL_DEFINITION = {
  name: "diagnose_crashes" as const,
  description: "Provide structured diagnosis for crashed services",
  input_schema: {
    type: "object" as const,
    properties: {
      diagnoses: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            service: { type: "string" as const, description: "Name of the crashed service" },
            problem: { type: "string" as const, description: "Short problem summary (1 line)" },
            explanation: { type: "string" as const, description: "Detailed explanation (2-3 sentences)" },
            fix_command: {
              type: "string" as const,
              description: "Suggested shell command to fix the issue, if applicable",
            },
          },
          required: ["service", "problem", "explanation"] as const,
        },
      },
    },
    required: ["diagnoses"] as const,
  },
};

function readProjectFile(root: string, relativePath: string): string | null {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) return null;
  try {
    const content = readFileSync(fullPath, "utf-8");
    return content.slice(0, 5000); // limit to 5KB per file
  } catch {
    return null;
  }
}

function buildPrompt(root: string, services: ServiceContext[]): string {
  const parts: string[] = [
    "Analyze these crashed service logs and provide a diagnosis for each.",
    "",
  ];

  for (const svc of services) {
    parts.push(`## Service: ${svc.name} (${svc.framework})`);
    parts.push(`Path: ${svc.path}`);
    parts.push(`Run command: ${svc.run}`);
    parts.push("");
    parts.push("### Last 200 lines of output:");
    parts.push("```");

    const lines = svc.logContent.split("\n");
    const lastLines = lines.slice(-200);
    parts.push(lastLines.join("\n"));
    parts.push("```");
    parts.push("");

    // Include relevant project files
    const packageJson = readProjectFile(root, join(svc.path, "package.json"));
    if (packageJson) {
      parts.push("### package.json:");
      parts.push("```json");
      parts.push(packageJson);
      parts.push("```");
      parts.push("");
    }

    const requirements = readProjectFile(root, join(svc.path, "requirements.txt"));
    if (requirements) {
      parts.push("### requirements.txt:");
      parts.push("```");
      parts.push(requirements);
      parts.push("```");
      parts.push("");
    }
  }

  parts.push("Use the diagnose_crashes tool to provide your analysis.");

  return parts.join("\n");
}

export async function diagnoseWithAI(
  root: string,
  apiKey: string,
  services: ServiceContext[],
): Promise<AIDiagnosis[]> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");

  const client = new Anthropic({ apiKey });
  const prompt = buildPrompt(root, services);

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    tools: [TOOL_DEFINITION],
    tool_choice: { type: "tool", name: "diagnose_crashes" },
    messages: [{ role: "user", content: prompt }],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("AI did not return a tool_use response");
  }

  const input = toolUse.input as { diagnoses: AIDiagnosis[] };
  return input.diagnoses;
}
