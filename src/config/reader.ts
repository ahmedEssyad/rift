import { readFileSync } from "node:fs";
import { parse } from "yaml";
import type { Service, RiftConfig } from "./schema.js";

function fatal(message: string): never {
  throw new Error(message);
}

interface RawService {
  path?: unknown;
  framework?: unknown;
  run?: unknown;
  build?: unknown;
  test?: unknown;
  install?: unknown;
  port?: unknown;
  restart?: unknown;
  depends_on?: unknown;
  env?: unknown;
}

function validateService(name: string, raw: RawService): Service {
  if (typeof raw.path !== "string") {
    fatal(`service "${name}" is missing required field "path"`);
  }
  if (typeof raw.framework !== "string") {
    fatal(`service "${name}" is missing required field "framework"`);
  }
  if (typeof raw.run !== "string") {
    fatal(`service "${name}" is missing required field "run"`);
  }

  const service: Service = {
    name,
    path: raw.path,
    framework: raw.framework,
    run: raw.run,
  };

  if (typeof raw.build === "string") service.build = raw.build;
  if (typeof raw.test === "string") service.test = raw.test;
  if (typeof raw.install === "string") service.install = raw.install;
  if (typeof raw.port === "number") service.port = raw.port;
  if (typeof raw.restart === "number") service.restart = raw.restart;

  if (Array.isArray(raw.depends_on)) {
    service.depends_on = raw.depends_on.filter((d): d is string => typeof d === "string");
  }

  if (raw.env !== null && typeof raw.env === "object" && !Array.isArray(raw.env)) {
    const env: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw.env as Record<string, unknown>)) {
      env[k] = String(v);
    }
    service.env = env;
  }

  return service;
}

export function readConfig(filePath: string): RiftConfig {
  let content: string;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    fatal(`could not read config file: ${filePath}`);
  }

  let doc: unknown;
  try {
    doc = parse(content);
  } catch {
    fatal(`invalid YAML in ${filePath}`);
  }

  if (doc === null || typeof doc !== "object") {
    fatal(`${filePath} is empty or not a valid config`);
  }

  const raw = doc as Record<string, unknown>;

  if (raw.version !== 1) {
    fatal(`unsupported config version: ${raw.version ?? "missing"}. expected: 1`);
  }

  if (raw.services === null || typeof raw.services !== "object" || Array.isArray(raw.services)) {
    fatal(`${filePath} is missing "services" section`);
  }

  const servicesMap = raw.services as Record<string, RawService>;
  const services: Service[] = [];

  for (const [name, rawService] of Object.entries(servicesMap)) {
    if (rawService === null || typeof rawService !== "object") {
      fatal(`service "${name}" must be an object`);
    }
    services.push(validateService(name, rawService));
  }

  if (services.length === 0) {
    fatal(`${filePath} has no services defined`);
  }

  const serviceNames = new Set(services.map((s) => s.name));
  for (const service of services) {
    if (service.depends_on) {
      for (const dep of service.depends_on) {
        if (!serviceNames.has(dep)) {
          fatal(`service "${service.name}" depends on unknown service "${dep}"`);
        }
      }
    }
  }

  return { version: 1, services };
}
