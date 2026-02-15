import { describe, test, expect, mock } from "bun:test";
import { calculateBackoff, resolveDependencyOrder } from "../../src/runner/lifecycle.js";
import type { Service } from "../../src/config/schema.js";

function makeService(name: string, depends_on?: string[]): Service {
  return { name, path: `./${name}`, framework: "express", run: "npm start", depends_on };
}

describe("calculateBackoff", () => {
  test("first restart is 1 second", () => {
    expect(calculateBackoff(0)).toBe(1000);
  });

  test("second restart is 2 seconds", () => {
    expect(calculateBackoff(1)).toBe(2000);
  });

  test("third restart is 4 seconds", () => {
    expect(calculateBackoff(2)).toBe(4000);
  });

  test("fourth restart is 8 seconds", () => {
    expect(calculateBackoff(3)).toBe(8000);
  });
});

describe("resolveDependencyOrder", () => {
  test("returns services in order when no deps", () => {
    const services = [makeService("a"), makeService("b")];
    const ordered = resolveDependencyOrder(services);
    expect(ordered.length).toBe(2);
  });

  test("puts dependencies first", () => {
    const services = [
      makeService("web", ["api"]),
      makeService("api"),
    ];
    const ordered = resolveDependencyOrder(services);
    expect(ordered[0].name).toBe("api");
    expect(ordered[1].name).toBe("web");
  });

  test("handles chain dependencies", () => {
    const services = [
      makeService("c", ["b"]),
      makeService("b", ["a"]),
      makeService("a"),
    ];
    const ordered = resolveDependencyOrder(services);
    expect(ordered[0].name).toBe("a");
    expect(ordered[1].name).toBe("b");
    expect(ordered[2].name).toBe("c");
  });

  test("throws on circular dependency", () => {
    const services = [
      makeService("a", ["b"]),
      makeService("b", ["a"]),
    ];

    expect(() => resolveDependencyOrder(services)).toThrow("circular dependency");
  });
});
