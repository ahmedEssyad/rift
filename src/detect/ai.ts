import type { Service } from "../config/schema.js";

export async function detectWithAI(_dir: string, _apiKey: string): Promise<Service[]> {
  throw new Error("AI detection not implemented yet");
}
