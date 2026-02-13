import { describe, test, expect } from "bun:test";
import { findPortConflicts, resolvePortConflicts, propagatePortChanges, isPortAvailable } from "../../src/runner/ports.js";
import type { Service } from "../../src/config/schema.js";
import { mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

function makeService(name: string, port?: number, framework = "express"): Service {
  return { name, path: `./${name}`, framework, run: "npm start", port };
}

describe("port conflict detection", () => {
  test("finds no conflicts when ports are unique", () => {
    const services = [makeService("api", 3000), makeService("web", 3001)];
    const conflicts = findPortConflicts(services);
    expect(conflicts.length).toBe(0);
  });

  test("finds conflicts when ports overlap", () => {
    const services = [makeService("api", 3000), makeService("web", 3000)];
    const conflicts = findPortConflicts(services);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].port).toBe(3000);
    expect(conflicts[0].services).toEqual(["api", "web"]);
  });

  test("ignores services without ports", () => {
    const services = [makeService("api", 3000), makeService("worker")];
    const conflicts = findPortConflicts(services);
    expect(conflicts.length).toBe(0);
  });

  test("finds multiple conflicts", () => {
    const services = [
      makeService("api", 3000),
      makeService("web", 3000),
      makeService("admin", 8080),
      makeService("proxy", 8080),
    ];
    const conflicts = findPortConflicts(services);
    expect(conflicts.length).toBe(2);
  });
});

describe("port conflict resolution", () => {
  test("resolves duplicate ports by incrementing", () => {
    const services = [makeService("api", 3000), makeService("web", 3000)];
    const { services: resolved, changes } = resolvePortConflicts(services);

    expect(resolved[0].port).toBe(3000);
    expect(resolved[1].port).toBe(3001);
    expect(changes.length).toBe(1);
    expect(changes[0]).toContain("web");
    expect(changes[0]).toContain("3001");
  });

  test("handles chain of conflicts", () => {
    const services = [
      makeService("a", 3000),
      makeService("b", 3000),
      makeService("c", 3000),
    ];
    const { services: resolved } = resolvePortConflicts(services);

    expect(resolved[0].port).toBe(3000);
    expect(resolved[1].port).toBe(3001);
    expect(resolved[2].port).toBe(3002);
  });

  test("does not modify services without conflicts", () => {
    const services = [makeService("api", 3000), makeService("web", 4000)];
    const { services: resolved, changes } = resolvePortConflicts(services);

    expect(resolved[0].port).toBe(3000);
    expect(resolved[1].port).toBe(4000);
    expect(changes.length).toBe(0);
  });

  test("skips services without ports", () => {
    const services = [makeService("api", 3000), makeService("worker")];
    const { services: resolved, changes } = resolvePortConflicts(services);

    expect(resolved[0].port).toBe(3000);
    expect(resolved[1].port).toBeUndefined();
    expect(changes.length).toBe(0);
  });

  test("injects PORT env var into reassigned service", () => {
    const services = [makeService("api", 3000), makeService("web", 3000)];
    const { services: resolved } = resolvePortConflicts(services);

    expect(resolved[1].env).toBeDefined();
    expect(resolved[1].env!.PORT).toBe("3001");
    expect(resolved[0].env).toBeUndefined();
  });

  test("updates run command for nextjs with port flag", () => {
    const services = [
      makeService("landing", 3000, "nextjs"),
      { name: "backend", path: "./backend", framework: "nextjs", run: "npm run dev", port: 3000 },
    ];
    const { services: resolved } = resolvePortConflicts(services);

    expect(resolved[1].run).toBe("npm run dev -p 3001");
  });

  test("portMap tracks all reassignments for same original port", () => {
    const services = [
      makeService("a", 3000),
      makeService("b", 3000),
      makeService("c", 3000),
    ];
    const { portMap } = resolvePortConflicts(services);

    expect(portMap.get(3000)).toEqual([3001, 3002]);
  });

  test("updates run command for django with port arg", () => {
    const services = [
      makeService("api1", 8000, "django"),
      { name: "api2", path: "./api2", framework: "django", run: "python manage.py runserver", port: 8000 },
    ];
    const { services: resolved } = resolvePortConflicts(services);

    expect(resolved[1].run).toBe("python manage.py runserver 8001");
  });
});

describe("propagatePortChanges", () => {
  function makeTmpProject(): string {
    const root = join(tmpdir(), `rift-port-test-${Date.now()}`);
    mkdirSync(join(root, "frontend"), { recursive: true });
    mkdirSync(join(root, "backend"), { recursive: true });
    return root;
  }

  test("updates localhost:PORT references in .env files", () => {
    const root = makeTmpProject();
    try {
      writeFileSync(join(root, "frontend", ".env"), "API_URL=http://localhost:3000/api\n");
      const services = [
        { name: "frontend", path: "./frontend", framework: "react", run: "npm start", port: 5173 },
        { name: "backend", path: "./backend", framework: "express", run: "npm start", port: 3001 },
      ];
      const changes = new Map([[3000, [3001]]]);
      const updates = propagatePortChanges(root, services, changes);

      expect(updates.length).toBe(1);
      expect(updates[0]).toContain("frontend/.env");

      const content = readFileSync(join(root, "frontend", ".env"), "utf-8");
      expect(content).toBe("API_URL=http://localhost:3001/api\n");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("updates 127.0.0.1:PORT references", () => {
    const root = makeTmpProject();
    try {
      writeFileSync(join(root, "frontend", ".env"), "WS_URL=ws://127.0.0.1:3000\n");
      const services = [
        { name: "frontend", path: "./frontend", framework: "react", run: "npm start", port: 5173 },
      ];
      const updates = propagatePortChanges(root, services, new Map([[3000, [3001]]]));

      expect(updates.length).toBe(1);
      const content = readFileSync(join(root, "frontend", ".env"), "utf-8");
      expect(content).toBe("WS_URL=ws://127.0.0.1:3001\n");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("updates multiple .env files", () => {
    const root = makeTmpProject();
    try {
      writeFileSync(join(root, "frontend", ".env"), "API=http://localhost:3000\n");
      writeFileSync(join(root, "frontend", ".env.development"), "API=http://localhost:3000\n");
      const services = [
        { name: "frontend", path: "./frontend", framework: "react", run: "npm start", port: 5173 },
      ];
      const updates = propagatePortChanges(root, services, new Map([[3000, [3001]]]));

      expect(updates.length).toBe(2);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("does not modify files without matching ports", () => {
    const root = makeTmpProject();
    try {
      writeFileSync(join(root, "frontend", ".env"), "API=http://localhost:8080\n");
      const services = [
        { name: "frontend", path: "./frontend", framework: "react", run: "npm start", port: 5173 },
      ];
      const updates = propagatePortChanges(root, services, new Map([[3000, [3001]]]));

      expect(updates.length).toBe(0);
      const content = readFileSync(join(root, "frontend", ".env"), "utf-8");
      expect(content).toBe("API=http://localhost:8080\n");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("returns empty when no port changes", () => {
    const root = makeTmpProject();
    try {
      const updates = propagatePortChanges(root, [], new Map());
      expect(updates.length).toBe(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("port availability", () => {
  test("reports unused port as available", async () => {
    const available = await isPortAvailable(59999);
    expect(available).toBe(true);
  });
});
