import { resolve } from "node:path";
import { execaCommand } from "execa";
import { readConfig } from "../config/reader.js";
import type { DiagnosisEntry } from "./index.js";

export interface ApplyResult {
  service: string;
  fixCommand: string;
  success: boolean;
  output: string;
}

export async function applyFixes(
  diagnoses: DiagnosisEntry[],
  root: string,
  configPath: string,
): Promise<ApplyResult[]> {
  const actionable = diagnoses.filter((d) => d.fix_command);
  if (actionable.length === 0) return [];

  // Read config to resolve service paths
  let servicePathMap = new Map<string, string>();
  try {
    const config = readConfig(configPath);
    for (const svc of config.services) {
      servicePathMap.set(svc.name, svc.path);
    }
  } catch { /* ignore — will use root as cwd */ }

  const results: ApplyResult[] = [];
  for (const diag of actionable) {
    const servicePath = servicePathMap.get(diag.service) ?? ".";
    const cwd = resolve(root, servicePath);

    const result = await execaCommand(diag.fix_command!, {
      cwd,
      shell: true,
      reject: false,
      timeout: 60000,
    });

    results.push({
      service: diag.service,
      fixCommand: diag.fix_command!,
      success: result.exitCode === 0,
      output: (result.stdout + "\n" + result.stderr).trim(),
    });
  }

  return results;
}
