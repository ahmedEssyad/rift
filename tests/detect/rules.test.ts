import { describe, test, expect } from "bun:test";
import { resolve } from "node:path";
import { detectServices } from "../../src/detect/rules.js";

const FIXTURES = resolve(import.meta.dir, "fixtures");

function detectFixture(name: string) {
  return detectServices(resolve(FIXTURES, name));
}

describe("rule-based detection", () => {
  test("detects next.js", () => {
    const services = detectFixture("nextjs-app");
    expect(services.length).toBe(1);
    expect(services[0].framework).toBe("nextjs");
    expect(services[0].port).toBe(3000);
  });

  test("detects django", () => {
    const services = detectFixture("django-app");
    expect(services.length).toBe(1);
    expect(services[0].framework).toBe("django");
    expect(services[0].port).toBe(8000);
  });

  test("detects express", () => {
    const services = detectFixture("express-app");
    expect(services.length).toBe(1);
    expect(services[0].framework).toBe("express");
  });

  test("detects react with vite", () => {
    const services = detectFixture("react-vite-app");
    expect(services.length).toBe(1);
    expect(services[0].framework).toBe("react");
    expect(services[0].port).toBe(5173);
  });

  test("detects vue", () => {
    const services = detectFixture("vue-app");
    expect(services.length).toBe(1);
    expect(services[0].framework).toBe("vue");
  });

  test("detects flask", () => {
    const services = detectFixture("flask-app");
    expect(services.length).toBe(1);
    expect(services[0].framework).toBe("flask");
    expect(services[0].port).toBe(5000);
  });

  test("detects fastapi", () => {
    const services = detectFixture("fastapi-app");
    expect(services.length).toBe(1);
    expect(services[0].framework).toBe("fastapi");
    expect(services[0].port).toBe(8000);
  });

  test("detects go", () => {
    const services = detectFixture("go-app");
    expect(services.length).toBe(1);
    expect(services[0].framework).toBe("go");
  });

  test("detects rust", () => {
    const services = detectFixture("rust-app");
    expect(services.length).toBe(1);
    expect(services[0].framework).toBe("rust");
  });

  test("detects nestjs over express", () => {
    const services = detectFixture("nestjs-app");
    expect(services.length).toBe(1);
    expect(services[0].framework).toBe("nestjs");
  });

  test("detects angular", () => {
    const services = detectFixture("angular-app");
    expect(services.length).toBe(1);
    expect(services[0].framework).toBe("angular");
    expect(services[0].port).toBe(4200);
  });

  test("detects svelte", () => {
    const services = detectFixture("svelte-app");
    expect(services.length).toBe(1);
    expect(services[0].framework).toBe("svelte");
  });

  test("detects rails", () => {
    const services = detectFixture("rails-app");
    expect(services.length).toBe(1);
    expect(services[0].framework).toBe("rails");
    expect(services[0].port).toBe(3000);
  });

  test("detects monorepo services", () => {
    const services = detectFixture("monorepo");
    expect(services.length).toBe(2);
    const frameworks = services.map((s) => s.framework).sort();
    expect(frameworks).toEqual(["express", "nextjs"]);
  });

  test("returns empty for project with no frameworks", () => {
    const services = detectFixture("empty-project");
    expect(services.length).toBe(0);
  });

  test("detects fastapi from pyproject.toml", () => {
    const services = detectFixture("fastapi-pyproject");
    expect(services.length).toBe(1);
    expect(services[0].framework).toBe("fastapi");
    expect(services[0].port).toBe(8000);
    expect(services[0].install).toBe("pip install -e .");
  });

  test("skips workspace root, detects workspace packages", () => {
    const services = detectFixture("workspace-root");
    expect(services.length).toBe(1);
    expect(services[0].framework).toBe("nextjs");
    expect(services[0].name).toBe("web");
  });

  test("detects procfile entries alongside framework detection", () => {
    const services = detectFixture("rails-procfile");
    const frameworks = services.map((s) => s.framework);
    expect(frameworks).toContain("rails");
    expect(frameworks).toContain("procfile");
    const procfileServices = services.filter((s) => s.framework === "procfile");
    expect(procfileServices.length).toBe(3);
    const names = procfileServices.map((s) => s.name).sort();
    expect(names).toEqual(["css", "web", "worker"]);
  });

  test("skips template directories", () => {
    const services = detectFixture("project-with-template");
    expect(services.length).toBe(1);
    expect(services[0].name).toBe("project-with-template");
  });

  test("detects rails via railties gem", () => {
    const services = detectFixture("rails-railties");
    expect(services.length).toBe(1);
    expect(services[0].framework).toBe("rails");
    expect(services[0].port).toBe(3000);
  });

  test("skips rust workspace members, detects root", () => {
    const services = detectFixture("rust-workspace");
    expect(services.length).toBe(1);
    expect(services[0].framework).toBe("rust");
    expect(services[0].name).toBe("rust-workspace");
  });

  test("skips express library without start/dev script", () => {
    const services = detectFixture("express-library");
    expect(services.length).toBe(0);
  });
});
