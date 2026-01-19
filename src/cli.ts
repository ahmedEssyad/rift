import { existsSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { resolve, basename } from "node:path";
import { Command } from "commander";
import pc from "picocolors";
import { detect } from "./detect/index.js";
import { writeConfig } from "./config/writer.js";
import type { Service } from "./config/schema.js";

const program = new Command();

function riftLog(message: string): void {
  console.error(`${pc.dim("rift")}  ${message}`);
}

function ensureGitignore(dir: string): void {
  const gitignorePath = resolve(dir, ".gitignore");
  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, "utf-8");
    if (!content.includes(".rift/")) {
      appendFileSync(gitignorePath, "\n.rift/\n");
    }
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
    const path = service.path;
    const port = service.port !== undefined ? `:${service.port}` : ":--";
    riftLog(`  ${pc.cyan(name)}  ${fw}  ${pc.dim(path)}  ${pc.dim(port)}`);
  }
}

program
  .name("rift")
  .description("Zero-config multi-service runner for full-stack projects")
  .version("0.0.1")
  .option("-v, --verbose", "show debug output and stack traces")
  .option("--no-color", "disable colored output")
  .option("-c, --config <path>", "path to rift.yml", "rift.yml");

program
  .command("init")
  .description("scan project and generate rift.yml")
  .option("--api-key <key>", "Anthropic API key for AI-powered detection")
  .action(async (opts) => {
    const globalOpts = program.opts();
    const dir = resolve(".");
    const configPath = resolve(dir, globalOpts.config);

    riftLog(`scanning ./${basename(dir)}...`);

    const services = await detect(dir, opts.apiKey, globalOpts.verbose);

    if (services.length === 0) {
      console.error(`${pc.dim("rift")}  ${pc.red("error: no services detected in ./" + basename(dir))}`);
      riftLog("hint: rift looks for package.json, requirements.txt, go.mod, Cargo.toml, or Gemfile");
      riftLog("hint: set ANTHROPIC_API_KEY for AI-powered detection of non-standard setups");
      process.exit(1);
    }

    riftLog(`detected ${services.length} service${services.length === 1 ? "" : "s"}:`);
    formatServiceTable(services);

    writeConfig(configPath, services);
    riftLog(`wrote ${globalOpts.config}`);

    ensureGitignore(dir);
    riftLog(`run \`npx rift run\` to start all services`);
  });

program
  .command("run")
  .description("start all services defined in rift.yml")
  .action(() => {
    console.log("not implemented yet");
    process.exit(0);
  });

program
  .command("stop")
  .description("stop all running services")
  .action(() => {
    console.log("not implemented yet");
    process.exit(0);
  });

program
  .command("status")
  .description("show status of running services")
  .action(() => {
    console.log("not implemented yet");
    process.exit(0);
  });

export function run(argv: string[]): void {
  program.parse(argv);
}
