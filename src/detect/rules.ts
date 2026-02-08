import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, basename } from "node:path";
import type { Service } from "../config/schema.js";

const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", ".nuxt",
  "__pycache__", ".venv", "venv", "target", ".rift", "vendor",
]);

const SERVICE_MARKERS = ["package.json", "requirements.txt", "go.mod", "Cargo.toml", "Gemfile"];

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  workspaces?: string[] | { packages: string[] };
}

function readJson(filePath: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function readTextLines(filePath: string): string[] {
  try {
    return readFileSync(filePath, "utf-8").split("\n");
  } catch {
    return [];
  }
}

function hasFile(dir: string, name: string): boolean {
  return existsSync(join(dir, name));
}

function hasFileGlob(dir: string, prefix: string): boolean {
  try {
    return readdirSync(dir).some((f) => f.startsWith(prefix));
  } catch {
    return false;
  }
}

function hasDep(pkg: PackageJson | null, name: string): boolean {
  if (pkg === null) return false;
  return name in (pkg.dependencies ?? {}) || name in (pkg.devDependencies ?? {});
}

function hasPyDep(dir: string, name: string): boolean {
  const lines = readTextLines(join(dir, "requirements.txt"));
  return lines.some((line) => {
    const trimmed = line.trim().toLowerCase();
    return trimmed === name || trimmed.startsWith(name + "==") || trimmed.startsWith(name + ">=");
  });
}

function hasGemDep(dir: string, name: string): boolean {
  const lines = readTextLines(join(dir, "Gemfile"));
  return lines.some((line) => line.includes(`'${name}'`) || line.includes(`"${name}"`));
}

interface Detection {
  framework: string;
  run: string;
  build?: string;
  test?: string;
  install?: string;
  port?: number;
}

function detectFramework(dir: string): Detection | null {
  const pkg = readJson(join(dir, "package.json")) as PackageJson | null;

  // NestJS (before Express — it uses Express internally)
  if (hasFile(dir, "nest-cli.json") || hasDep(pkg, "@nestjs/core")) {
    return { framework: "nestjs", run: "npm run start:dev", test: "npm test", install: "npm install", port: 3000 };
  }

  // Nuxt (before Vue — Nuxt is built on Vue)
  if (hasFileGlob(dir, "nuxt.config") || hasDep(pkg, "nuxt")) {
    return { framework: "nuxt", run: "npm run dev", build: "npm run build", install: "npm install", port: 3000 };
  }

  // Next.js (before React — Next uses React)
  if (hasFileGlob(dir, "next.config") || hasDep(pkg, "next")) {
    return { framework: "nextjs", run: "npm run dev", build: "npm run build", test: "npm test", install: "npm install", port: 3000 };
  }

  // SvelteKit / Svelte
  if (hasFileGlob(dir, "svelte.config") || hasDep(pkg, "@sveltejs/kit") || hasDep(pkg, "svelte")) {
    return { framework: "svelte", run: "npm run dev", build: "npm run build", install: "npm install", port: 5173 };
  }

  // Angular
  if (hasFile(dir, "angular.json") || hasDep(pkg, "@angular/core")) {
    return { framework: "angular", run: "npm start", build: "npm run build", test: "npm test", install: "npm install", port: 4200 };
  }

  // Vue (Vite + Vue)
  if (hasDep(pkg, "vue")) {
    return { framework: "vue", run: "npm run dev", build: "npm run build", install: "npm install", port: 5173 };
  }

  // Expo / React Native (before generic React — Expo uses React)
  if (hasDep(pkg, "expo")) {
    let port = 8081;
    const startScript = (pkg as Record<string, unknown> & { scripts?: Record<string, string> }).scripts?.start;
    if (startScript) {
      const portMatch = startScript.match(/--port\s+(\d+)/);
      if (portMatch) port = parseInt(portMatch[1], 10);
    }
    return { framework: "expo", run: "npm start", install: "npm install", port };
  }

  // React (CRA or Vite)
  if (hasDep(pkg, "react-scripts")) {
    return { framework: "react", run: "npm start", build: "npm run build", test: "npm test", install: "npm install", port: 3000 };
  }
  if (hasDep(pkg, "vite") && hasDep(pkg, "react")) {
    return { framework: "react", run: "npm run dev", build: "npm run build", install: "npm install", port: 5173 };
  }

  // Fastify (before Express — more specific)
  if (hasDep(pkg, "fastify")) {
    return { framework: "fastify", run: "npm run dev", test: "npm test", install: "npm install", port: 3000 };
  }

  // Express
  if (hasDep(pkg, "express")) {
    return { framework: "express", run: "npm start", test: "npm test", install: "npm install", port: 3000 };
  }

  // Django
  if (hasFile(dir, "manage.py") && hasPyDep(dir, "django")) {
    return { framework: "django", run: "python manage.py runserver", test: "python manage.py test", install: "pip install -r requirements.txt", port: 8000 };
  }

  // Flask
  if ((hasFile(dir, "app.py") || hasFile(dir, "wsgi.py")) && hasPyDep(dir, "flask")) {
    return { framework: "flask", run: "flask run", install: "pip install -r requirements.txt", port: 5000 };
  }

  // FastAPI
  if (hasPyDep(dir, "fastapi")) {
    return { framework: "fastapi", run: "uvicorn main:app --reload", install: "pip install -r requirements.txt", port: 8000 };
  }

  // Rails
  if (hasFile(dir, "Gemfile") && hasFile(dir, "config/routes.rb") && hasGemDep(dir, "rails")) {
    return { framework: "rails", run: "bin/rails server", test: "bin/rails test", install: "bundle install", port: 3000 };
  }

  // Go
  if (hasFile(dir, "go.mod")) {
    return { framework: "go", run: "go run .", build: "go build .", test: "go test ./..." };
  }

  // Rust
  if (hasFile(dir, "Cargo.toml")) {
    return { framework: "rust", run: "cargo run", build: "cargo build", test: "cargo test" };
  }

  return null;
}

function hasServiceMarker(dir: string): boolean {
  return SERVICE_MARKERS.some((marker) => hasFile(dir, marker));
}

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

export function scanDirectories(root: string): string[] {
  const candidates = new Set<string>();

  // Root is always a candidate
  if (hasServiceMarker(root)) {
    candidates.add(root);
  }

  // Check workspace/monorepo dirs first
  const workspaceDirs = getWorkspaceDirs(root);
  for (const dir of workspaceDirs) {
    if (hasServiceMarker(dir)) {
      candidates.add(dir);
    }
  }

  // Walk up to 3 levels deep
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
    } catch { /* permission error, skip */ }
  }

  walk(root, 1);
  return Array.from(candidates);
}

export function detectServices(root: string): Service[] {
  const dirs = scanDirectories(root);
  const services: Service[] = [];

  for (const dir of dirs) {
    const detection = detectFramework(dir);
    if (detection === null) continue;

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

  return services;
}
