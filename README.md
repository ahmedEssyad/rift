# rift

Zero-config multi-service runner for full-stack projects. One command to detect, configure, and run everything.

```
npx rift init   → scans your project, generates rift.yml
npx rift run    → starts all services, one terminal
npx rift stop   → kills everything
npx rift status → shows what's running
```

## Quick start

```bash
cd my-fullstack-project
npx rift init
npx rift run
```

That's it. No config files to write. Rift scans your project, detects frameworks, and generates a `rift.yml` with the right commands, ports, and dependencies.

## Example output

```
$ npx rift init
rift  scanning ./my-project...
rift  detected 3 services:
rift    api       django    ./backend       :8000
rift    frontend  nextjs    ./frontend      :3000
rift    worker    celery    ./backend       :--
rift  wrote rift.yml
rift  run `npx rift run` to start all services
```

```
$ npx rift run
rift      starting api (port 8000)...
rift      starting frontend (port 3000)...
api       Watching for file changes with StatReloader
api       System check identified no issues.
frontend  ready - started server on 0.0.0.0:3000
```

## Supported frameworks

| Framework | Detection method |
|-----------|-----------------|
| Next.js | `next.config.*` or `next` in deps |
| React (CRA/Vite) | `react-scripts` or `vite` + `react` in deps |
| Vue | `vue` in deps |
| Nuxt | `nuxt.config.*` or `nuxt` in deps |
| Svelte/SvelteKit | `svelte.config.*` or `svelte`/`@sveltejs/kit` in deps |
| Angular | `angular.json` or `@angular/core` in deps |
| Express | `express` in deps |
| Fastify | `fastify` in deps |
| NestJS | `nest-cli.json` or `@nestjs/core` in deps |
| Django | `manage.py` + `django` in requirements.txt |
| Flask | `app.py`/`wsgi.py` + `flask` in requirements.txt |
| FastAPI | `fastapi` in requirements.txt |
| Rails | `Gemfile` + `config/routes.rb` + `rails` in Gemfile |
| Go | `go.mod` |
| Rust | `Cargo.toml` |

## AI-powered detection

Set `ANTHROPIC_API_KEY` to enable AI detection for non-standard project structures. Rift uses Claude Haiku (~$0.001/call) to analyze your project and detect services that rule-based detection might miss.

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npx rift init
```

AI detection is optional. Everything works without it — rule-based detection is the default.

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

## Global flags

| Flag | Short | Purpose |
|------|-------|---------|
| `--verbose` | `-v` | Debug output and stack traces |
| `--no-color` | — | Disable colors (also respects `NO_COLOR` env var) |
| `--config <path>` | `-c` | Use a specific rift.yml (default: `./rift.yml`) |

## Contributing

See [CLAUDE.md](./CLAUDE.md) for architecture, coding standards, and design principles.

## License

MIT
