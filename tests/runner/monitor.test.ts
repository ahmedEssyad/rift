import { describe, test, expect } from "bun:test";
import { parseResourceOutput } from "../../src/runner/monitor.js";

describe("parseResourceOutput", () => {
  test("parses ps output with single process", () => {
    const output = "  1234   5.3  51200\n";
    const results = parseResourceOutput(output);

    expect(results.length).toBe(1);
    expect(results[0].pid).toBe(1234);
    expect(results[0].cpu).toBe(5.3);
    expect(results[0].memMB).toBe(50);
  });

  test("parses ps output with multiple processes", () => {
    const output = `  1234  12.3  45056
  5678   3.1 131072
`;
    const results = parseResourceOutput(output);

    expect(results.length).toBe(2);
    expect(results[0].pid).toBe(1234);
    expect(results[0].cpu).toBe(12.3);
    expect(results[0].memMB).toBe(44);
    expect(results[1].pid).toBe(5678);
    expect(results[1].cpu).toBe(3.1);
    expect(results[1].memMB).toBe(128);
  });

  test("handles empty output", () => {
    const results = parseResourceOutput("");
    expect(results.length).toBe(0);
  });

  test("skips malformed lines", () => {
    const output = "  1234  12.3  45056\n  bad line\n  5678   3.1 131072\n";
    const results = parseResourceOutput(output);
    expect(results.length).toBe(2);
  });

  test("handles zero cpu and memory", () => {
    const output = "  9999   0.0      0\n";
    const results = parseResourceOutput(output);

    expect(results.length).toBe(1);
    expect(results[0].cpu).toBe(0);
    expect(results[0].memMB).toBe(0);
  });
});
