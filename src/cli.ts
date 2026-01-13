import { Command } from "commander";

const program = new Command();

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
  .action(() => {
    console.log("not implemented yet");
    process.exit(0);
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
