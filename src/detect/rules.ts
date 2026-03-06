import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, basename } from "node:path";
import type { Service } from "../config/schema.js";
import { readJson, readTextLines, hasFile, hasServiceMarker, detectFramework } from "./frameworks.js";
import type { PackageJson } from "./frameworks.js";

const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", ".nuxt",
  "__pycache__", ".venv", "venv", "target", ".rift", "vendor",
  "template", "templates", "examples", "example", "fixtures",
  "__tests__", "test", "tests", "e2e", "cypress",
]);

function getWorkspaceDirs(root: string): string[] {
  const pkg = readJson(join(root, "package.json")) as PackageJson | null;

  // npm/yarn workspaces
  if (pkg?.workspaces) {
    const patterns = Array.isArray(pkg.workspaces) ? pkg.workspaces : pkg.workspaces.packages ?? [];
    const dirs: string[] = [];
    for (const pattern of patterns) {
      const base = pattern.replace(/\/?\*$/, "");
      const baseDir = join(root, base);
      if (existsSync(baseDir) && statSync(baseDir).isDirectory()) {
        try {
          for (const entry of readdirSync(baseDir)) {
            const full = join(baseDir, entry);
            if (statSync(full).isDirectory()) dirs.push(full);
          }
        } catch { /* skip */ }
      }
    }
    return dirs;
  }

  // pnpm workspaces
  if (hasFile(root, "pnpm-workspace.yaml")) {
    const dirs: string[] = [];
    for (const name of ["packages", "apps"]) {
      const dir = join(root, name);
      if (existsSync(dir) && statSync(dir).isDirectory()) {
        try {
          for (const entry of readdirSync(dir)) {
            const full = join(dir, entry);
            if (statSync(full).isDirectory()) dirs.push(full);
          }
        } catch { /* skip */ }
      }
    }
    return dirs;
  }

  // Common monorepo dirs
  for (const name of ["packages", "apps"]) {
    const dir = join(root, name);
    if (existsSync(dir) && statSync(dir).isDirectory()) {
      const dirs: string[] = [];
      try {
        for (const entry of readdirSync(dir)) {
          const full = join(dir, entry);
          if (statSync(full).isDirectory()) dirs.push(full);
        }
      } catch { /* skip */ }
      if (dirs.length > 0) return dirs;
    }
  }

  return [];
}

export function scanDirectories(root: string, verbose?: boolean): string[] {
  const candidates = new Set<string>();

  if (hasServiceMarker(root)) {
    candidates.add(root);
  }

  const workspaceDirs = getWorkspaceDirs(root);
  for (const dir of workspaceDirs) {
    if (hasServiceMarker(dir)) {
      candidates.add(dir);
    }
  }

  function walk(dir: string, depth: number): void {
    if (depth > 3) return;
    try {
      for (const entry of readdirSync(dir)) {
        if (SKIP_DIRS.has(entry)) continue;
        const full = join(dir, entry);
        if (!statSync(full).isDirectory()) continue;
        if (hasServiceMarker(full)) {
          candidates.add(full);
        }
        walk(full, depth + 1);
      }
    } catch (err) {
      if (verbose) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`rift  warning: failed to scan ${dir}: ${msg}`);
      }
    }
  }

  walk(root, 1);
  return Array.from(candidates);
}

interface ProcfileEntry {
  name: string;
  command: string;
}

function parseProcfile(filePath: string): ProcfileEntry[] {
  const lines = readTextLines(filePath);
  const entries: ProcfileEntry[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;
    const name = trimmed.slice(0, colonIdx).trim();
    const command = trimmed.slice(colonIdx + 1).trim();
    if (name !== "" && command !== "") {
      entries.push({ name, command });
    }
  }
  return entries;
}

const JS_FRAMEWORKS = new Set([
  "nextjs", "nuxt", "react", "vue", "svelte", "angular",
  "express", "fastify", "nestjs", "expo",
]);

function isWorkspaceRoot(dir: string): boolean {
  const pkg = readJson(join(dir, "package.json")) as PackageJson | null;
  if (pkg?.workspaces) return true;
  if (hasFile(dir, "pnpm-workspace.yaml")) return true;
  return false;
}

export function detectServices(root: string, verbose?: boolean): Service[] {
  const dirs = scanDirectories(root, verbose);
  const services: Service[] = [];

  for (const dir of dirs) {
    const detection = detectFramework(dir);
    if (detection === null) continue;

    // Skip JS framework false positives at workspace roots (deps are shared, not runnable)
    if (dir === root && isWorkspaceRoot(dir) && JS_FRAMEWORKS.has(detection.framework)) continue;

    const relPath = dir === root ? "." : "./" + relative(root, dir);
    const name = dir === root ? basename(root) : basename(dir);

    services.push({
      name,
      path: relPath,
      framework: detection.framework,
      run: detection.run,
      build: detection.build,
      test: detection.test,
      install: detection.install,
      port: detection.port,
    });
  }

  // Parse Procfile.dev / Procfile for additional services
  for (const dir of dirs) {
    const relPath = dir === root ? "." : "./" + relative(root, dir);
    const procfilePath = existsSync(join(dir, "Procfile.dev"))
      ? join(dir, "Procfile.dev")
      : existsSync(join(dir, "Procfile"))
        ? join(dir, "Procfile")
        : null;
    if (procfilePath === null) continue;

    const existingNames = new Set(services.map((s) => s.name));
    const entries = parseProcfile(procfilePath);
    for (const entry of entries) {
      if (existingNames.has(entry.name)) continue;
      services.push({
        name: entry.name,
        path: relPath,
        framework: "procfile",
        run: entry.command,
      });
      existingNames.add(entry.name);
    }
  }

  return services;
}
