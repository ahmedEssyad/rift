import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { detectServices } from "./rules.js";
import type { Service } from "../config/schema.js";

function resolveApiKey(flagKey?: string): string | undefined {
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

export async function detect(dir: string, flagApiKey?: string, verbose?: boolean): Promise<Service[]> {
  const apiKey = resolveApiKey(flagApiKey);

  if (apiKey) {
    try {
      if (verbose) {
        console.error("rift  using AI for enhanced detection...");
      }
      const { detectWithAI } = await import("./ai.js");
      return await detectWithAI(dir, apiKey);
    } catch (err) {
      if (verbose) {
        console.error("rift  AI detection failed, falling back to rules");
        if (err instanceof Error) {
          console.error(`rift  ${err.message}`);
        }
      }
    }
  }

  return detectServices(dir);
}
