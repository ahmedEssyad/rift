import { describe, test, expect } from "bun:test";
import { resolve } from "node:path";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readConfig } from "../../src/config/reader.js";

const FIXTURE = resolve(import.meta.dir, "../fixtures/rift.yml");

describe("config reader", () => {
  test("reads valid config", () => {
    const config = readConfig(FIXTURE);
    expect(config.version).toBe(1);
    expect(config.services.length).toBe(2);
  });

  test("parses service fields correctly", () => {
    const config = readConfig(FIXTURE);
    const api = config.services.find((s) => s.name === "api")!;
    expect(api.path).toBe("./backend");
    expect(api.framework).toBe("django");
    expect(api.run).toBe("python manage.py runserver");
    expect(api.port).toBe(8000);
    expect(api.install).toBe("pip install -r requirements.txt");
  });

  test("parses depends_on", () => {
    const config = readConfig(FIXTURE);
    const frontend = config.services.find((s) => s.name === "frontend")!;
    expect(frontend.depends_on).toEqual(["api"]);
  });

  test("services without depends_on have undefined", () => {
    const config = readConfig(FIXTURE);
    const api = config.services.find((s) => s.name === "api")!;
    expect(api.depends_on).toBeUndefined();
  });

  test("throws on unknown depends_on reference", () => {
    const dir = mkdtempSync(join(tmpdir(), "rift-test-"));
    const configPath = join(dir, "rift.yml");
    writeFileSync(configPath, `version: 1\nservices:\n  web:\n    path: ./web\n    framework: nextjs\n    run: npm run dev\n    depends_on:\n      - nonexistent\n`, "utf-8");
    expect(() => readConfig(configPath)).toThrow('service "web" depends on unknown service "nonexistent"');
  });
});
