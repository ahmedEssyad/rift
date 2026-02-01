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
});
