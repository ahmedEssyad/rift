import { detectServices } from "./rules.js";
import { resolveApiKey } from "../utils.js";
import type { Service } from "../config/schema.js";

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

  return detectServices(dir, verbose);
}
