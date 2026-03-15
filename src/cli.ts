import { existsSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { resolve, basename } from "node:path";
import { Command } from "commander";
import pc from "picocolors";
import { detect } from "./detect/index.js";
import { readConfig } from "./config/reader.js";
import { writeConfig } from "./config/writer.js";
import { fix, diagnose } from "./fix/index.js";
import { applyFixes } from "./fix/apply.js";
import { createLogger } from "./runner/logger.js";
import { startAll, stopServices, readPidFile, processAlive } from "./runner/index.js";
import { resolvePortConflicts, checkPortsAvailable, propagatePortChanges } from "./runner/ports.js";
import { printResourceTable } from "./runner/monitor.js";
import type { Service } from "./config/schema.js";

const program = new Command();

function riftLog(message: string): void {
  console.error(`${pc.dim("rift")}  ${message}`);
}

function jsonOut(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
}

function ensureGitignore(dir: string): void {
  const gitignorePath = resolve(dir, ".gitignore");
  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, "utf-8");
    if (!content.includes(".rift/")) appendFileSync(gitignorePath, "\n.rift/\n");
  } else {
    writeFileSync(gitignorePath, ".rift/\n", "utf-8");
  }
}

function formatServiceTable(services: Service[]): void {
  const maxName = Math.max(...services.map((s) => s.name.length));
  const maxFw = Math.max(...services.map((s) => s.framework.length));
  for (const service of services) {
    const name = service.name.padEnd(maxName);
    const fw = service.framework.padEnd(maxFw);
    const port = service.port !== undefined ? `:${service.port}` : ":--";
    riftLog(`  ${pc.cyan(name)}  ${fw}  ${pc.dim(service.path)}  ${pc.dim(port)}`);
  }
}

function formatUptime(startedAt: string): string {
  const diff = Date.now() - new Date(startedAt).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

program
  .name("rift")
  .description("Zero-config multi-service runner for full-stack projects")
  .version("0.2.4")
  .option("-v, --verbose", "show debug output and stack traces")
  .option("--no-color", "disable colored output")
  .option("-c, --config <path>", "path to rift.yml", "rift.yml")
  .option("--json", "output structured JSON");

program
  .command("init")
  .description("scan project and generate rift.yml")
  .option("--api-key <key>", "Anthropic API key for AI-powered detection")
  .action(async (opts) => {
    const globalOpts = program.opts();
    const json = globalOpts.json;
    const log = json ? () => {} : riftLog;
    const dir = resolve(".");
    const configPath = resolve(dir, globalOpts.config);

    log(`scanning ./${basename(dir)}...`);
    const services = await detect(dir, opts.apiKey, globalOpts.verbose);

    if (services.length === 0) {
      if (json) {
        jsonOut({ error: "no services detected", services: [] });
        return;
      }
      console.error(`${pc.dim("rift")}  ${pc.red("error: no services detected in ./" + basename(dir))}`);
      riftLog("hint: rift looks for package.json, requirements.txt, go.mod, Cargo.toml, or Gemfile");
      riftLog("hint: set ANTHROPIC_API_KEY for AI-powered detection of non-standard setups");
      process.exit(1);
    }

    const { services: resolvedServices, changes, portMap } = resolvePortConflicts(services);
    for (const change of changes) log(change);
    const envUpdates = propagatePortChanges(dir, resolvedServices, portMap);
    for (const update of envUpdates) log(update);

    if (json) {
      jsonOut({
        services: resolvedServices,
        portConflicts: changes,
        envUpdates,
      });
    }

    log(`detected ${resolvedServices.length} service${resolvedServices.length === 1 ? "" : "s"}:`);
    if (!json) formatServiceTable(resolvedServices);

    writeConfig(configPath, resolvedServices);
    log(`wrote ${globalOpts.config}`);
    ensureGitignore(dir);
    log(`run \`npx rift run\` to start all services`);
  });

program
  .command("run")
  .description("start all services defined in rift.yml")
  .option("--max-restarts <n>", "max auto-restarts per service (default: 3)", parseInt)
  .action(async (opts) => {
    const globalOpts = program.opts();
    const root = resolve(".");
    const configPath = resolve(root, globalOpts.config);

    if (!existsSync(configPath)) {
      riftLog(`error: ${globalOpts.config} not found. run \`npx rift init\` first`);
      process.exit(1);
    }

    const config = readConfig(configPath);

    const unavailable = await checkPortsAvailable(config.services);
    if (unavailable.length > 0) {
      for (const { name, port } of unavailable) {
        riftLog(`error: port ${port} already in use (needed by ${name})`);
        riftLog(`hint: run \`lsof -i :${port}\` to find the process`);
      }
      process.exit(1);
    }

    const logDir = resolve(root, ".rift", "logs");
    const logger = createLogger(config.services.map((s) => s.name), { logDir });
    const maxRestarts = opts.maxRestarts !== undefined ? opts.maxRestarts : undefined;

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding("utf-8");
      process.stdin.on("data", (key: string) => {
        if (key === "r") {
          const entries = readPidFile(root);
          const alive = entries.filter((e) => processAlive(e.pid));
          if (alive.length > 0) printResourceTable(alive, logger);
          else logger.rift("no services running");
        }
        if (key === "\u0003") process.emit("SIGINT", "SIGINT");
      });
    }

    try {
      await startAll(config.services, root, logger, { maxRestarts });
    } finally {
      logger.flush();
      if (process.stdin.isTTY) { process.stdin.setRawMode(false); process.stdin.pause(); }
    }
  });

program
  .command("stop")
  .description("stop all running services")
  .action(async () => {
    const globalOpts = program.opts();
    const json = globalOpts.json;
    const result = await stopServices(resolve("."));
    if (json) {
      jsonOut(result);
    } else {
      if (result.stopped.length === 0 && result.alreadyStopped.length === 0) {
        riftLog("no running services found");
      } else {
        for (const name of result.stopped) riftLog(`stopped ${name}`);
        for (const name of result.alreadyStopped) riftLog(`${name} already stopped`);
      }
    }
  });

program
  .command("status")
  .description("show status of running services")
  .action(() => {
    const globalOpts = program.opts();
    const json = globalOpts.json;
    const root = resolve(".");
    const entries = readPidFile(root);
    const alive = entries.filter((e) => processAlive(e.pid));

    if (json) {
      jsonOut({
        services: entries.map((e) => ({
          name: e.name,
          pid: e.pid,
          port: e.port,
          startedAt: e.startedAt,
          alive: processAlive(e.pid),
        })),
        running: alive.length,
      });
      return;
    }

    if (alive.length === 0) { riftLog("no services running"); return; }

    riftLog(`${alive.length} service${alive.length === 1 ? "" : "s"} running:`);
    const maxName = Math.max(...alive.map((e) => e.name.length));
    for (const entry of alive) {
      const name = entry.name.padEnd(maxName);
      const port = entry.port !== undefined ? `:${entry.port}` : "";
      riftLog(`  ${pc.cyan(name)}  ${pc.dim(`pid ${entry.pid}`)}  ${port}  ${pc.dim(`uptime ${formatUptime(entry.startedAt)}`)}`);
    }
  });

program
  .command("fix")
  .description("diagnose crashed services using logs")
  .option("--api-key <key>", "Anthropic API key for AI-powered diagnosis")
  .option("--apply", "execute suggested fix commands")
  .action(async (opts) => {
    const globalOpts = program.opts();
    const json = globalOpts.json;
    const root = resolve(".");
    const configPath = resolve(globalOpts.config);

    if (opts.apply || json) {
      const result = await diagnose(configPath, root, opts.apiKey, globalOpts.verbose);

      if (result.diagnoses.length === 0 && !json) {
        riftLog("no crash logs found or log files are empty");
        return;
      }

      let applyResults = undefined;
      if (opts.apply) {
        const { applyFixes: doApply } = await import("./fix/apply.js");
        applyResults = await doApply(result.diagnoses, root, configPath);

        if (!json) {
          for (const r of applyResults) {
            if (r.success) {
              riftLog(`${pc.green("fixed")} ${r.service}: ${r.fixCommand}`);
            } else {
              riftLog(`${pc.red("failed")} ${r.service}: ${r.fixCommand}`);
              riftLog(`  ${r.output.split("\n")[0]}`);
            }
          }
        }
      }

      if (json) {
        const output: Record<string, unknown> = {
          source: result.source,
          diagnoses: result.diagnoses,
        };
        if (applyResults) {
          output.applied = applyResults;
        }
        jsonOut(output);
      } else if (!opts.apply) {
        // json-only mode without --apply: pretty-print diagnoses
        await fix(configPath, root, opts.apiKey, globalOpts.verbose);
      }
      return;
    }

    await fix(configPath, root, opts.apiKey, globalOpts.verbose);
  });

export async function run(argv: string[]): Promise<void> {
  if (process.env.NO_COLOR !== undefined) pc.createColors(false);

  program.exitOverride();
  try {
    await program.parseAsync(argv);
  } catch (err) {
    if (err instanceof Error && "exitCode" in err) {
      process.exit((err as { exitCode: number }).exitCode);
    }
    const verbose = argv.includes("--verbose") || argv.includes("-v");
    if (verbose && err instanceof Error) console.error(err.stack);
    process.exit(1);
  }
}
