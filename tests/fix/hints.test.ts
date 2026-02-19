import { describe, test, expect } from "bun:test";
import { matchHints, getGenericHint } from "../../src/fix/hints.js";

describe("matchHints", () => {
  test("matches EADDRINUSE", () => {
    const log = "Error: listen EADDRINUSE: address already in use :::3000";
    const result = matchHints("api", log);
    expect(result).not.toBeNull();
    expect(result!.problem).toBe("port already in use");
    expect(result!.suggestion).toContain("3000");
  });

  test("matches MODULE_NOT_FOUND", () => {
    const log = "Error: Cannot find module 'express'\nRequire stack:\n- /app/index.js";
    const result = matchHints("api", log);
    expect(result).not.toBeNull();
    expect(result!.problem).toBe("missing dependency");
    expect(result!.suggestion).toContain("npm install");
  });

  test("matches permission denied", () => {
    const log = "Error: EACCES: Permission denied, open '/etc/hosts'";
    const result = matchHints("api", log);
    expect(result).not.toBeNull();
    expect(result!.problem).toBe("permission denied");
  });

  test("matches database table missing", () => {
    const log = 'django.db.utils.OperationalError: no such table: auth_user';
    const result = matchHints("api", log);
    expect(result).not.toBeNull();
    expect(result!.problem).toBe("database table missing");
    expect(result!.suggestion).toContain("migration");
  });

  test("matches Python ImportError", () => {
    const log = "ImportError: No module named 'django'";
    const result = matchHints("api", log);
    expect(result).not.toBeNull();
    expect(result!.problem).toBe("missing Python module");
  });

  test("matches ECONNREFUSED", () => {
    const log = "Error: connect ECONNREFUSED 127.0.0.1:5432";
    const result = matchHints("api", log);
    expect(result).not.toBeNull();
    expect(result!.problem).toBe("connection refused");
  });

  test("matches out of memory", () => {
    const log = "FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory";
    const result = matchHints("api", log);
    expect(result).not.toBeNull();
    expect(result!.problem).toBe("out of memory");
  });

  test("returns null for unknown errors", () => {
    const log = "Some random unrecognized error output";
    const result = matchHints("api", log);
    expect(result).toBeNull();
  });

  test("includes last output lines", () => {
    const log = "line1\nline2\nline3\nline4\nline5\nline6\nError: Cannot find module 'foo'";
    const result = matchHints("api", log);
    expect(result).not.toBeNull();
    expect(result!.lastOutput).toContain("Error: Cannot find module");
  });
});

describe("getGenericHint", () => {
  test("returns generic hint with last output", () => {
    const log = "some error\nhappened here";
    const result = getGenericHint("api", log);
    expect(result.problem).toBe("unknown error");
    expect(result.suggestion).toContain("ANTHROPIC_API_KEY");
    expect(result.lastOutput).toContain("happened here");
  });
});
