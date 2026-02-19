import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import pc from "picocolors";
import { readConfig } from "../config/reader.js";
import { resolveApiKey } from "../utils.js";
import { matchHints, getGenericHint } from "./hints.js";

function riftLog(message: string): void {
  console.error(`${pc.dim("rift")}  ${message}`);
}

export interface DiagnosisEntry {
  service: string;
  problem: string;
  explanation?: string;
  suggestion?: string;
  fix_command?: string;
  lastOutput?: string;
}

export interface DiagnosisResult {
  source: "ai" | "hints";
  diagnoses: DiagnosisEntry[];
}

export async function diagnose(
  configPath: string,
  root: string,
  flagApiKey?: string,
  verbose?: boolean,
): Promise<DiagnosisResult> {
  const logDir = join(root, ".rift", "logs");

  if (!existsSync(logDir)) {
    return { source: "hints", diagnoses: [] };
  }

  const logFiles = readdirSync(logDir).filter((f) => f.endsWith(".log"));
  if (logFiles.length === 0) {
    return { source: "hints", diagnoses: [] };
  }

  // Read config to get service metadata
  let serviceMap = new Map<string, { framework: string; path: string; run: string }>();
  if (existsSync(configPath)) {
    const config = readConfig(configPath);
    for (const svc of config.services) {
      serviceMap.set(svc.name, { framework: svc.framework, path: svc.path, run: svc.run });
    }
  }

  // Read log contents
  const serviceLogs: { name: string; content: string; framework: string; path: string; run: string }[] = [];
  for (const file of logFiles) {
    const name = file.replace(/\.log$/, "");
    const content = readFileSync(join(logDir, file), "utf-8");
    if (content.trim().length === 0) continue;

    const meta = serviceMap.get(name) ?? { framework: "unknown", path: `./${name}`, run: "unknown" };
    serviceLogs.push({ name, content, ...meta });
  }

  if (serviceLogs.length === 0) {
    return { source: "hints", diagnoses: [] };
  }

  // Try AI diagnosis first
  const apiKey = resolveApiKey(flagApiKey);
  if (apiKey) {
    try {
      const { diagnoseWithAI } = await import("./ai.js");
      const aiDiagnoses = await diagnoseWithAI(
        root,
        apiKey,
        serviceLogs.map((s) => ({
          name: s.name,
          framework: s.framework,
          path: s.path,
          run: s.run,
          logContent: s.content,
        })),
      );

      return {
        source: "ai",
        diagnoses: aiDiagnoses.map((d) => ({
          service: d.service,
          problem: d.problem,
          explanation: d.explanation,
          fix_command: d.fix_command,
        })),
      };
    } catch (err) {
      if (verbose && err instanceof Error) {
        console.error(`rift  AI diagnosis failed: ${err.message}`);
      }
    }
  }

  // Non-AI fallback: pattern matching
  const diagnoses: DiagnosisEntry[] = [];
  for (const svc of serviceLogs) {
    const hint = matchHints(svc.name, svc.content) ?? getGenericHint(svc.name, svc.content);
    diagnoses.push({
      service: svc.name,
      problem: hint.problem,
      suggestion: hint.suggestion,
      fix_command: hint.fix_command,
      lastOutput: hint.lastOutput,
    });
  }

  return { source: "hints", diagnoses };
}

export async function fix(configPath: string, root: string, flagApiKey?: string, verbose?: boolean): Promise<void> {
  const logDir = join(root, ".rift", "logs");

  if (!existsSync(logDir)) {
    riftLog("no crash logs found — run services with `npx rift run` first");
    return;
  }

  const logFiles = readdirSync(logDir).filter((f) => f.endsWith(".log"));
  if (logFiles.length === 0) {
    riftLog("no crash logs found — services may not have produced any output");
    return;
  }

  const result = await diagnose(configPath, root, flagApiKey, verbose);

  if (result.diagnoses.length === 0) {
    riftLog("log files are empty — no output to analyze");
    return;
  }

  // Read config for framework info in display
  let serviceMap = new Map<string, { framework: string }>();
  if (existsSync(configPath)) {
    try {
      const config = readConfig(configPath);
      for (const svc of config.services) {
        serviceMap.set(svc.name, { framework: svc.framework });
      }
    } catch { /* ignore */ }
  }

  if (result.source === "ai") {
    riftLog("analyzing crash logs...");
    riftLog("");
    for (const diag of result.diagnoses) {
      const meta = serviceMap.get(diag.service);
      const framework = meta ? ` (${meta.framework})` : "";
      riftLog(`${pc.cyan(diag.service)}${framework}:`);
      riftLog(`  problem: ${diag.problem}`);
      if (diag.explanation) riftLog(`  ${diag.explanation}`);
      if (diag.fix_command) {
        riftLog("");
        riftLog(`  suggested fix:`);
        riftLog(`    ${pc.green(diag.fix_command)}`);
      }
      riftLog("");
    }
  } else {
    const apiKey = resolveApiKey(flagApiKey);
    for (const diag of result.diagnoses) {
      riftLog(`service "${pc.cyan(diag.service)}" crashed`);
      riftLog(`  problem: ${diag.problem}`);
      if (diag.lastOutput) {
        riftLog(`  last output:`);
        for (const line of diag.lastOutput.split("\n")) {
          riftLog(`    ${line}`);
        }
      }
      riftLog("");
      if (diag.suggestion) riftLog(`  hint: ${diag.suggestion}`);
      if (!apiKey && (!diag.suggestion || !diag.suggestion.includes("ANTHROPIC_API_KEY"))) {
        riftLog(`  hint: set ANTHROPIC_API_KEY for AI-powered diagnosis`);
      }
      riftLog("");
    }
  }
}
