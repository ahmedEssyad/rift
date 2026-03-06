import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SERVICE_MARKERS = ["package.json", "requirements.txt", "pyproject.toml", "go.mod", "Cargo.toml", "Gemfile"];

export interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  workspaces?: string[] | { packages: string[] };
}

export interface Detection {
  framework: string;
  run: string;
  build?: string;
  test?: string;
  install?: string;
  port?: number;
}

export function readJson(filePath: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

export function readTextLines(filePath: string): string[] {
  try {
    return readFileSync(filePath, "utf-8").split("\n");
  } catch {
    return [];
  }
}

export function hasFile(dir: string, name: string): boolean {
  return existsSync(join(dir, name));
}

export function hasFileGlob(dir: string, prefix: string): boolean {
  try {
    return readdirSync(dir).some((f) => f.startsWith(prefix));
  } catch {
    return false;
  }
}

export function hasDep(pkg: PackageJson | null, name: string): boolean {
  if (pkg === null) return false;
  return name in (pkg.dependencies ?? {}) || name in (pkg.devDependencies ?? {});
}

function hasPyDepRequirements(dir: string, name: string): boolean {
  const lines = readTextLines(join(dir, "requirements.txt"));
  return lines.some((line) => {
    const trimmed = line.trim().toLowerCase();
    return trimmed === name || trimmed.startsWith(name + "==") || trimmed.startsWith(name + ">=");
  });
}

function hasPyDepPyProject(dir: string, name: string): boolean {
  try {
    const content = readFileSync(join(dir, "pyproject.toml"), "utf-8");
    const pattern = new RegExp(`["']${name}[^"']*["']`);
    return pattern.test(content);
  } catch {
    return false;
  }
}

export function hasPyDep(dir: string, name: string): boolean {
  return hasPyDepRequirements(dir, name) || hasPyDepPyProject(dir, name);
}

export function pyInstallCmd(dir: string): string {
  if (existsSync(join(dir, "requirements.txt"))) {
    return "pip install -r requirements.txt";
  }
  return "pip install -e .";
}

export function hasGemDep(dir: string, name: string): boolean {
  const lines = readTextLines(join(dir, "Gemfile"));
  return lines.some((line) => line.includes(`'${name}'`) || line.includes(`"${name}"`));
}

export function hasServiceMarker(dir: string): boolean {
  return SERVICE_MARKERS.some((marker) => hasFile(dir, marker));
}

function isCargoWorkspaceMember(dir: string): boolean {
  try {
    const content = readFileSync(join(dir, "Cargo.toml"), "utf-8");
    // Workspace roots have [workspace], members have .workspace = true
    if (content.includes("[workspace]")) return false;
    return /\.workspace\s*=\s*true/.test(content);
  } catch {
    return false;
  }
}

function hasStartOrDev(pkg: PackageJson | null): boolean {
  if (pkg === null) return false;
  const scripts = pkg.scripts ?? {};
  return "start" in scripts || "dev" in scripts;
}

// Each rule is tried in order — first match wins. Order matters:
// more specific frameworks (NestJS, Nuxt, Next) must come before
// their base frameworks (Express, Vue, React).
export function detectFramework(dir: string): Detection | null {
  const pkg = readJson(join(dir, "package.json")) as PackageJson | null;

  if (hasFile(dir, "nest-cli.json") || hasDep(pkg, "@nestjs/core")) {
    return { framework: "nestjs", run: "npm run start:dev", test: "npm test", install: "npm install", port: 3000 };
  }
  if (hasFileGlob(dir, "nuxt.config") || hasDep(pkg, "nuxt")) {
    return { framework: "nuxt", run: "npm run dev", build: "npm run build", install: "npm install", port: 3000 };
  }
  if (hasFileGlob(dir, "next.config") || hasDep(pkg, "next")) {
    return { framework: "nextjs", run: "npm run dev", build: "npm run build", test: "npm test", install: "npm install", port: 3000 };
  }
  if (hasFileGlob(dir, "svelte.config") || hasDep(pkg, "@sveltejs/kit") || hasDep(pkg, "svelte")) {
    return { framework: "svelte", run: "npm run dev", build: "npm run build", install: "npm install", port: 5173 };
  }
  if (hasFile(dir, "angular.json") || hasDep(pkg, "@angular/core")) {
    return { framework: "angular", run: "npm start", build: "npm run build", test: "npm test", install: "npm install", port: 4200 };
  }
  if (hasDep(pkg, "vue")) {
    return { framework: "vue", run: "npm run dev", build: "npm run build", install: "npm install", port: 5173 };
  }
  if (hasDep(pkg, "expo")) {
    let port = 8081;
    const startScript = pkg?.scripts?.start;
    if (startScript) {
      const portMatch = startScript.match(/--port\s+(\d+)/);
      if (portMatch) port = parseInt(portMatch[1], 10);
    }
    return { framework: "expo", run: "npm start", install: "npm install", port };
  }
  if (hasDep(pkg, "react-scripts")) {
    return { framework: "react", run: "npm start", build: "npm run build", test: "npm test", install: "npm install", port: 3000 };
  }
  if (hasDep(pkg, "vite") && hasDep(pkg, "react")) {
    return { framework: "react", run: "npm run dev", build: "npm run build", install: "npm install", port: 5173 };
  }
  if (hasDep(pkg, "fastify") && hasStartOrDev(pkg)) {
    return { framework: "fastify", run: "npm run dev", test: "npm test", install: "npm install", port: 3000 };
  }
  if (hasDep(pkg, "express") && hasStartOrDev(pkg)) {
    return { framework: "express", run: "npm start", test: "npm test", install: "npm install", port: 3000 };
  }
  if (hasFile(dir, "manage.py") && hasPyDep(dir, "django")) {
    return { framework: "django", run: "python manage.py runserver", test: "python manage.py test", install: pyInstallCmd(dir), port: 8000 };
  }
  if ((hasFile(dir, "app.py") || hasFile(dir, "wsgi.py")) && hasPyDep(dir, "flask")) {
    return { framework: "flask", run: "flask run", install: pyInstallCmd(dir), port: 5000 };
  }
  if (hasPyDep(dir, "fastapi")) {
    return { framework: "fastapi", run: "uvicorn main:app --reload", install: pyInstallCmd(dir), port: 8000 };
  }
  if (hasFile(dir, "Gemfile") && hasFile(dir, "config/routes.rb") && (hasGemDep(dir, "rails") || hasGemDep(dir, "railties"))) {
    return { framework: "rails", run: "bin/rails server", test: "bin/rails test", install: "bundle install", port: 3000 };
  }
  if (hasFile(dir, "go.mod")) {
    return { framework: "go", run: "go run .", build: "go build .", test: "go test ./..." };
  }
  if (hasFile(dir, "Cargo.toml") && !isCargoWorkspaceMember(dir)) {
    return { framework: "rust", run: "cargo run", build: "cargo build", test: "cargo test" };
  }
  return null;
}
