# rift

Zero-config multi-service runner for full-stack projects. One command to detect, configure, and run everything.

> Published as `rift-dev` on npm (`rift` was taken). Install once, then use `rift` everywhere.

Read the deep dive: [The Architecture of a Zero-Config Dev Runner](https://blog.essyad.site/rift-the-architecture-of-a-zero-config-dev-runner)

```
rift init   → scans your project, generates rift.yml
rift run    → starts all services, one terminal
rift stop   → kills everything
rift status → shows what's running
rift fix    → diagnoses crashed services
```

## Install

```bash
npm install -g rift-dev
```

Or use directly with npx (no install needed):

```bash
npx rift-dev init
```

## Quick start

```bash
cd my-fullstack-project
rift init
rift run
```

That's it. No config files to write. Rift scans your project, detects frameworks, resolves port conflicts, and generates a `rift.yml` with the right commands, ports, and dependencies.

## Example output

```
$ rift init
rift  scanning ./my-project...
rift  port conflict: reassigned worker from :3000 to :3001
rift  updated frontend/.env (:3000 -> :3001)
rift  detected 3 services:
rift    api       django    ./backend       :8000
rift    frontend  nextjs    ./frontend      :3000
rift    worker    express   ./worker        :3001
rift  wrote rift.yml
rift  run `rift run` to start all services
```

```
$ rift run
rift      starting api (port 8000)...
rift      starting frontend (port 3000)...
api       Watching for file changes with StatReloader
api       System check identified no issues.
frontend  ready - started server on 0.0.0.0:3000
frontend  compiled in 1.2s
```

## Features

- **Zero-config detection** — scans your project and figures out what to run
- **Port conflict resolution** — auto-reassigns ports and updates `.env` files
- **Multiplexed logs** — color-coded output from all services in one terminal
- **Auto-restart** — crashed services restart with exponential backoff
- **Crash diagnosis** — `rift fix` analyzes logs and suggests fixes (AI-powered or pattern matching)
- **Dependency ordering** — services start in the right order based on `depends_on`
- **JSON output** — `--json` flag on all commands for scripts and AI agents
- **MCP server** — expose rift as tools for Claude Code and other MCP clients

## Supported frameworks

| Framework | Detection method |
|-----------|-----------------|
| Next.js | `next.config.*` or `next` in deps |
| React (CRA/Vite) | `react-scripts` or `vite` + `react` in deps |
| Vue | `vue` in deps + `src/App.vue` |
| Nuxt | `nuxt.config.*` or `nuxt` in deps |
| Svelte/SvelteKit | `svelte.config.*` or `svelte`/`@sveltejs/kit` in deps |
| Angular | `angular.json` or `@angular/core` in deps |
| Expo/React Native | `expo` in deps |
| Express | `express` in deps (with start/dev script) |
| Fastify | `fastify` in deps |
| NestJS | `nest-cli.json` or `@nestjs/core` in deps |
| Django | `manage.py` + `django` in requirements |
| Flask | `app.py`/`wsgi.py` + `flask` in requirements |
| FastAPI | `fastapi` in requirements or pyproject.toml |
| Rails | `Gemfile` + `config/routes.rb` + `rails` in Gemfile |
| Go | `go.mod` |
| Rust | `Cargo.toml` |

Set `ANTHROPIC_API_KEY` to enable AI detection for frameworks beyond this list.

## Commands

### `rift init`

Scans the project, detects services, resolves port conflicts, and writes `rift.yml`.

```bash
rift init                          # rule-based detection
ANTHROPIC_API_KEY=sk-... rift init # AI-enhanced detection
```

### `rift run`

Starts all services with multiplexed logs. Press `r` to show CPU/memory usage.

```bash
rift run
rift run --max-restarts 5
```

### `rift stop`

Stops all running services.

```bash
rift stop
```

### `rift status`

Shows running services with PIDs, ports, and uptime.

```bash
rift status
rift status --json
```

### `rift fix`

Diagnoses crashed services using AI or pattern matching.

```bash
rift fix               # diagnose only
rift fix --apply       # diagnose and execute fixes
```

## Global flags

| Flag | Short | Purpose |
|------|-------|---------|
| `--verbose` | `-v` | Debug output and stack traces |
| `--no-color` | -- | Disable colors (also respects `NO_COLOR` env var) |
| `--config <path>` | `-c` | Use a specific rift.yml |
| `--json` | -- | Structured JSON output for scripts and AI agents |

## MCP server

Rift ships an MCP server that exposes 6 tools for Claude Code and other MCP clients:

| Tool | Purpose |
|------|---------|
| `rift_detect` | Scan project and write rift.yml |
| `rift_status` | Show running services |
| `rift_start` | Start services |
| `rift_stop` | Stop services |
| `rift_diagnose` | Diagnose crashed services |
| `rift_fix_apply` | Diagnose and execute fixes |

### Setup with Claude Code

```bash
claude mcp add rift-mcp -- npx -p rift-dev rift-mcp
```

### Setup with Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "rift": {
      "command": "npx",
      "args": ["-p", "rift-dev", "rift-mcp"]
    }
  }
}
```

## rift.yml

`rift init` generates this file. You can edit it by hand.

```yaml
version: 1

services:
  api:
    path: ./backend
    framework: django
    run: python manage.py runserver
    build: python -m build
    test: python manage.py test
    install: pip install -r requirements.txt
    port: 8000
    restart: 5
    depends_on: []
    env:
      DATABASE_URL: postgres://localhost:5432/mydb

  frontend:
    path: ./frontend
    framework: nextjs
    run: npm run dev
    build: npm run build
    test: npm test
    install: npm install
    port: 3000
    depends_on:
      - api
```

## Contributing

```bash
bun install          # install deps
bun run dev          # run from source
bun test             # 94 tests
bun run build        # compile TS → JS
```

## License

MIT
