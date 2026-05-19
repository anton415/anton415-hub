# anton415-hub

`anton415-hub` is a personal productivity monorepo undergoing a **Todo-only AI-first rebuild**.

Production lives at [anton415.ru](https://anton415.ru) (Yandex ID auth, single-owner). It must stay runnable throughout the rebuild; module removals and the backend move to `server/` happen only in Phase 7, behind an explicit refactor plan.

## Rebuild direction

- **Active module:** Todo (only).
- **Frozen modules:** Finance, Calendar, Orchestrator, Investments, FIRE. Code is preserved for now and will be removed in Phase 7 per the Phase 6 refactor plan. PostgreSQL migrations are kept in `migrations/` for potential restore.
- **Out of scope:** News, AI chat, any new module.

Binding scope and architecture decisions live in [`rebuild/todo_hub_ai_first_rebuild_spec.md`](rebuild/todo_hub_ai_first_rebuild_spec.md) §15.

## Documentation

- **AI agents start here:** [`rebuild/AGENT.md`](rebuild/AGENT.md) — cold-start workflow and forbidden actions.
- **Working rules:** [`AI.md`](AI.md).
- **Rebuild spec:** [`rebuild/todo_hub_ai_first_rebuild_spec.md`](rebuild/todo_hub_ai_first_rebuild_spec.md) — what must be true.
- **Rebuild plan:** [`rebuild/todo_hub_ai_first_rebuild_plan.md`](rebuild/todo_hub_ai_first_rebuild_plan.md) — phased methodology.
- **Current phase and progress:** [`rebuild/TASKS.md`](rebuild/TASKS.md) — one checked box per merged PR.
- **Architecture decisions:** [`docs/adr/`](docs/adr/).
- **Repository snapshot (Phase 0):** [`docs/audit/repo-map.md`](docs/audit/repo-map.md).

GitHub Wiki pages are drafted in Phase 9 and are not yet published.

## How to run locally

Prerequisites: Docker Compose, Go 1.25, Node.js 22+ with npm 10+.

```sh
cp .env.example .env
make dev
```

That brings up PostgreSQL, applies migrations, starts the Go API, and serves the Vite frontend at <http://localhost:5173>. The API listens on <http://localhost:8080>.

Other useful targets:

```sh
make stop     # stop local Docker services
make test     # Go and frontend unit tests
make lint     # Go vet/format and frontend typecheck
make build    # backend and frontend production build
```

The full set of local commands and surfaces is being rewritten as part of the rebuild; this section will be expanded once Phase 7 lands the new layout (`server/`, `packages/domain`, `packages/ui`, `packages/config`, `apps/web`).

## Contributing

This repository is single-owner. PRs from AI agents follow [`rebuild/AGENT.md`](rebuild/AGENT.md):

- One unchecked task in `rebuild/TASKS.md` = one PR.
- Conventional commit prefixes: `docs:`, `refactor:`, `feat(todo):`, `test(todo):`, `chore:`.
- No `--no-verify`, no force-push, no destructive git operations.
- Touching `deploy/`, `migrations/`, `Dockerfile`, `docker-compose.yml`, `Caddyfile`, or `.github/workflows/` requires explicit per-PR approval.
