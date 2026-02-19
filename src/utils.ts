import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export function resolveApiKey(flagKey?: string): string | undefined {
  if (flagKey) return flagKey;

  const envKey = process.env.ANTHROPIC_API_KEY;
  if (envKey) return envKey;

  const configPath = join(homedir(), ".rift", "config.json");
  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, "utf-8"));
      if (typeof config.api_key === "string") return config.api_key;
    } catch { /* ignore */ }
  }

  return undefined;
}
