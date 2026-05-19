# Repository Map — Phase 0 Snapshot

> Read this together with [`rebuild/AGENT.md`](../../rebuild/AGENT.md) and [`rebuild/TASKS.md`](../../rebuild/TASKS.md).
> Snapshot date: 2026-05-19 (start of Todo-only AI-first rebuild).
> Purpose: a fresh AI agent should be able to locate the current Todo implementation, the frozen modules, scripts, deployment artifacts, and the documents slated for deletion in Phase 1 — without re-exploring the tree.
> **Inspection only.** This file does not propose or perform any changes.

---

## 1. Top-level layout (depth 2–3)

```text
anton415-hub/
├── ANALYSIS.md                  # legacy long-form analysis (slated for deletion in Phase 1)
├── CHANGELOG.md                 # legacy changelog (slated for deletion in Phase 1)
├── PLAN.md                      # legacy multi-module plan (slated for deletion in Phase 1)
├── README.md                    # production-focused; will be rewritten in task 1.4
├── Dockerfile                   # multi-stage build (Go + Vite assets)
├── Makefile                     # primary task runner (see §3)
├── docker-compose.yml           # local dev compose (postgres + api + web + n8n)
├── go.mod / go.sum              # Go module `github.com/anton415/anton415-hub`, Go 1.25
├── .env.example                 # local env template
├── .dockerignore / .gitignore
├── .github/
│   ├── workflows/{ci.yml, deploy.yml}
│   ├── ISSUE_TEMPLATE/{bug.yml, feature.yml, config.yml}
│   ├── pull_request_template.md
│   ├── release.yml
│   └── dependabot.yml
├── apps/
│   ├── api/main.go              # Go API entry point
│   └── web/                     # Vite + React + TS frontend
├── internal/                    # Go domain code (see §4)
│   ├── auth/
│   ├── todo/                    # ACTIVE — Todo backend
│   ├── finance/                 # FROZEN
│   ├── orchestrator/            # FROZEN
│   ├── fire/                    # FROZEN (stub only)
│   ├── investments/             # FROZEN (stub only)
│   └── platform/                # config, db, http, httpjson, logging
├── migrations/                  # 11 SQL migration pairs (see §6)
├── deploy/                      # production compose, Caddy, n8n, backup, lockbox sync
├── infra/terraform/             # Yandex Cloud VM/cloud-init via Terraform
├── scripts/todo-integration-smoke.sh
├── docs/                        # legacy docs (most deleted in task 1.5; see §7)
└── rebuild/                     # rebuild source-of-truth (AGENT.md, TASKS.md, spec, plan)
```

The repo is a single Go module plus a single npm workspace under `apps/web/`. There is no top-level `package.json` and no npm/pnpm workspaces yet — the target monorepo layout (`packages/domain`, `packages/ui`, `packages/config`, `apps/web`) is a Phase 7 outcome, not the current state.

---

## 2. Runtime architecture (current)

- **Single Go binary** built from `apps/api/main.go`. It hosts the REST API and (in production) serves the built Vite assets from `STATIC_DIR`.
- **PostgreSQL 16** as the only data store (`internal/platform/db` uses `pgxpool`).
- **Frontend** is built with Vite, embedded into the same container, and served by the Go binary.
- **Caddy** terminates HTTPS in production (`deploy/caddy/Caddyfile`).
- **Auth**: Yandex ID OAuth + server-side sessions, HttpOnly cookies. GitHub and VK providers are also wired but Yandex is the production path.

---

## 3. Scripts and entry points

### Makefile targets

| Target | Effect |
|---|---|
| `dev` | `docker compose up postgres api web` |
| `orchestrator-dev` | Adds n8n + n8n-postgres to `dev` |
| `api` | API + Postgres only |
| `web` | `npm install && npm run dev` in `apps/web/` |
| `db` | Postgres only |
| `n8n` / `n8n-import-orchestrator` | n8n bringup + workflow import |
| `stop` | `docker compose down` |
| `test` | `go test ./...` then `npm run test:run` |
| `test-e2e` | `npm run test:e2e` |
| `test-integration` | `scripts/todo-integration-smoke.sh` |
| `lint` | `gofmt -l` (must be empty), `go vet ./...`, `npm run check` (`tsc --noEmit`) |
| `build` | `go build ./...` + `npm run build` |
| `docker-build` | `docker build -t anton415-hub:local .` |
| `migrate-up` / `migrate-down` | `docker compose run migrate ... up` / `down 1` |
| `docker-config` | `docker compose config` |
| `go-mod-tidy` | `go mod tidy` |

Notes:
- The Makefile transparently shells out to `golang:1.25-alpine` via Docker if `go`/`gofmt` are not on `PATH`.
- `npm run test:run` and `npm run test:e2e` are currently echo-only placeholders — there are **no real frontend tests yet** (see `apps/web/package.json`).

### Go entry point

- `apps/api/main.go` — `package main`. Loads config, connects to Postgres, mounts `platformhttp.NewRouter(...)` on `cfg.HTTPAddr`, supports graceful shutdown via SIGINT/SIGTERM.
- Router lives in [`internal/platform/http/router.go`](../../internal/platform/http/router.go). It mounts `/health`, `/api/v1/auth`, `/api/v1/me`, and (behind auth) `/api/v1/todo`, `/api/v1/finance`, `/api/v1/orchestrator`. The `/api/v1/orchestrator/n8n` callback router is mounted **without** session auth and uses a callback token instead.

### Frontend `apps/web/package.json`

- Stack: React 18.3, React Router 7.13, Vite 6, TypeScript 5.8, Tailwind 4.1, Radix UI primitives, `lucide-react`, `date-fns`, `class-variance-authority`, `clsx`, `tailwind-merge`.
- Scripts: `dev` (`vite`), `check` (`tsc --noEmit`), `build` (`tsc --noEmit && vite build`), `preview`, `test:run` (placeholder), `test:e2e` (placeholder).
- Node engine pinned to `>=22 <25`, npm `>=10`.

---

## 4. Backend code — `internal/`

All packages live under module `github.com/anton415/anton415-hub`.

### Todo (ACTIVE — the only scope of the rebuild)

```text
internal/todo/
├── doc.go                                     # package marker
├── domain/
│   ├── errors.go
│   ├── project.go         project_test.go
│   └── task.go            task_test.go
├── application/
│   ├── errors.go
│   ├── filter.go
│   ├── service.go         service_test.go
├── adapters/
│   ├── http/handler.go              handler_test.go
│   └── postgres/repository.go       repository_test.go
```

- HTTP entrypoint: `internal/todo/adapters/http/handler.go`, exposes `NewRouter(service)`.
- Service layer: `internal/todo/application/service.go` with `Dependencies{ Projects, Tasks, Location }` injected from `router.go`.
- Repository: `internal/todo/adapters/postgres/repository.go` implements both `Projects` and `Tasks` interfaces.
- Domain entities: `Task`, `Project`, related errors, and filter logic. **This is where the rebuild's domain model in spec §8.2 will land.**

### Auth (KEPT — production already uses Yandex ID)

```text
internal/auth/
├── service.go               service_test.go
├── smtp_sender.go
└── adapters/
    ├── http/{handler.go, handler_test.go, rate_limit.go}
    └── postgres/repository.go
```

Auth is **not** being redesigned in this rebuild (see `rebuild/AGENT.md` §2).

### Platform (KEPT — shared infrastructure)

```text
internal/platform/
├── config/{config.go, config_test.go}    # env-based config loader
├── db/db.go                              # pgxpool wrapper
├── http/{router.go, middleware.go, router_test.go}
├── httpjson/{request.go, request_test.go}
└── logging/logging.go                    # slog-based logger
```

### Frozen modules (deletion targets for Phase 7, NOT Phase 1)

- `internal/finance/` — full DDD slice (domain, application, adapters/http, adapters/postgres) with tests; mounted at `/api/v1/finance`.
- `internal/orchestrator/` — full DDD slice + `adapters/n8n/client.go`; mounted at `/api/v1/orchestrator` (user routes) and `/api/v1/orchestrator/n8n` (callback router).
- `internal/fire/doc.go` — package boundary marker only, no implementation.
- `internal/investments/doc.go` — package boundary marker only, no implementation.

Each frozen module is wired into `internal/platform/http/router.go`; removing them in Phase 7 requires updating that file in lockstep.

---

## 5. Frontend code — `apps/web/src/`

```text
apps/web/src/
├── main.tsx
├── app/
│   ├── App.tsx
│   ├── ErrorBoundary.tsx
│   ├── routes.tsx                        # react-router routes (see below)
│   ├── api/
│   │   ├── client.ts                     # fetch wrapper / base URL
│   │   ├── authApi.ts
│   │   ├── todoApi.ts                    # ACTIVE
│   │   ├── financeApi.ts                 # FROZEN
│   │   ├── financeFormat.ts              # FROZEN
│   │   ├── orchestratorApi.ts            # FROZEN
│   │   ├── types.ts
│   │   └── index.ts
│   ├── components/
│   │   ├── Dashboard.tsx                 # module grid (uses shared/config/modules.ts)
│   │   ├── LoginPage.tsx
│   │   ├── FinancesPage.tsx              # FROZEN
│   │   ├── CalendarComingSoon.tsx        # placeholder
│   │   ├── orchestrator/{Home,Projects,Workflow}Page.tsx + shared.tsx  # FROZEN
│   │   └── ui/                           # Radix-based primitives (button, dialog, sheet, etc.)
│   ├── hooks/useAuthGate.ts
│   └── layouts/AppShell.tsx
├── modules/
│   └── tasks/                            # ACTIVE — Todo UI
│       ├── TasksPage.tsx
│       ├── TaskList.tsx     TaskListItem.tsx
│       ├── TaskEditSheet.tsx
│       ├── TaskSubtasks.tsx
│       ├── TaskSidebar.tsx
│       ├── ProjectDialog.tsx
│       ├── hooks/{useProjects.ts, useTasks.ts}
│       └── lib/{buildTree.ts, constants.ts, describeError.ts, payloads.ts}
├── shared/config/modules.ts              # module registry (Tasks, Finance, Investments, FIRE, Calendar, Orchestrator)
└── styles/{index.css, tailwind.css, theme.css}
```

### Current routes (`apps/web/src/app/routes.tsx`)

| Path | Component | Notes |
|---|---|---|
| `/` | `Dashboard` | Module grid |
| `/login` | `LoginPage` | |
| `/tasks` | `TasksPage` | **Todo — active** |
| `/todo` | `TasksPage` | Backend auth redirects here |
| `/finances` | `FinancesPage` | FROZEN |
| `/investments` | inline placeholder | FROZEN |
| `/fire` | inline placeholder | FROZEN |
| `/calendar` | `CalendarComingSoon` | FROZEN |
| `/orchestrator` | `OrchestratorHomePage` | FROZEN |
| `/orchestrator/projects` | `OrchestratorProjectsPage` | FROZEN |
| `/orchestrator/workflows/:workflowId` | `OrchestratorWorkflowPage` | FROZEN |
| `*` | "Страница не найдена" | |

`apps/web/src/shared/config/modules.ts` is the **single source of truth for the dashboard module grid**. Six modules are registered (`tasks`, `finances`, `investments`, `fire`, `calendar`, `orchestrator`). The Phase 7 navigation hide-step (task 7.0) will most likely operate on this file plus `routes.tsx`.

---

## 6. Database migrations — `migrations/`

11 numbered `.up.sql` / `.down.sql` pairs, applied via `golang-migrate` (`docker compose run --rm migrate ...`).

| # | File | Module |
|---|---|---|
| 1 | `000001_create_platform_metadata` | Platform |
| 2 | `000002_create_todo` | **Todo** |
| 3 | `000003_create_auth` | Auth |
| 4 | `000004_reminders_todo` | **Todo** |
| 5 | `000005_create_finance` | Finance (frozen) |
| 6 | `000006_income_components` | Finance (frozen) |
| 7 | `000007_finance_settings` | Finance (frozen) |
| 8 | `000008_task_url` | **Todo** |
| 9 | `000009_project_lifecycle` | **Todo** |
| 10 | `000010_todo_hierarchy_archive_recurrence` | **Todo** |
| 11 | `000011_create_orchestrator` | Orchestrator (frozen) |

Per `rebuild/AGENT.md` §2 and spec §15.5, migrations are **preserved in place** even after the frozen modules' Go code is deleted. The exact strategy (keep tables vs `DROP` with backup) is deferred to a Phase 7 ADR.

---

## 7. Documentation inventory

### Root-level markdown

| File | Lines | Status per spec §15.4 / TASKS.md 1.5 |
|---|---:|---|
| `README.md` | 153 | Will be **rewritten** in task 1.4 |
| `ANALYSIS.md` | 1187 | **Delete** in task 1.5 |
| `PLAN.md` | 381 | **Delete** in task 1.5 |
| `CHANGELOG.md` | 73 | **Delete** in task 1.5 |

### `docs/` tree

| Path | Status per spec §15.4 / TASKS.md 1.5 |
|---|---|
| `docs/architecture.md` | Delete |
| `docs/dev-setup.md` | Delete |
| `docs/roadmap.md` | Delete |
| `docs/migration.md` | Delete |
| `docs/production.md` | Delete |
| `docs/doc-inventory.md` | Delete |
| `docs/dependency-updates.md` | Delete |
| `docs/github-actions.md` | Delete |
| `docs/github-feature-ritual.md` | Delete |
| `docs/yandex-cost-estimate.md` | Delete |
| `docs/specs/mission.md` | Delete (under `docs/specs/`) |
| `docs/specs/roadmap.md` | Delete (under `docs/specs/`) |
| `docs/specs/tech-stack.md` | Delete (under `docs/specs/`) |
| `docs/design/anton415-hub-redesign-v1.md` | Delete (under `docs/design/`) |
| `docs/design/anton415-hub-redesign-v2.md` | Delete (under `docs/design/`) |
| `docs/modules/orchestrator/README.md` | Delete (under `docs/modules/`) |
| `docs/audit/repo-map.md` | **This file (Phase 0 task 0.2)** |

There are currently no other directories under `docs/`. The rebuild's planned new directories (`docs/adr/`, `docs/system-design/`, `docs/refactor/`, `docs/prompts/`, `docs/production/`, `docs/wiki/`, `docs/learning-log/`) do **not yet exist** — they are created starting in Phase 1.

### `rebuild/` tree (the active source of truth)

```text
rebuild/
├── AGENT.md
├── TASKS.md
├── todo_hub_ai_first_rebuild_plan.md
└── todo_hub_ai_first_rebuild_spec.md
```

---

## 8. Deployment, infrastructure, and CI

### `deploy/`

| File | Role |
|---|---|
| `deploy/README.md` | Production runbook (will be revisited in Phase 7+) |
| `deploy/docker-compose.production.yml` | Production compose stack |
| `deploy/caddy/Caddyfile` | HTTPS termination / reverse proxy |
| `deploy/backup/pg_dump_to_object_storage.sh` | Postgres → Yandex Object Storage backup |
| `deploy/lockbox-sync.sh` | Yandex Lockbox secret sync |
| `deploy/migrate-production.sh` | Production migration wrapper |
| `deploy/n8n/README.md` | n8n integration notes |
| `deploy/n8n/workflows/orchestrator-ai-feature-delivery-v0.json` | n8n workflow definition |

Per `rebuild/AGENT.md` §4, any change under `deploy/` requires **explicit per-PR user approval**.

### `infra/terraform/`

`main.tf`, `variables.tf`, `outputs.tf`, `versions.tf`, `cloud-init.yaml.tftpl`, `README.md` — Yandex Cloud VM provisioning. Not touched by this rebuild unless explicitly approved.

### `.github/`

| File | Role |
|---|---|
| `.github/workflows/ci.yml` | CI: gofmt, `go vet`, `go test`, frontend `npm run check` |
| `.github/workflows/deploy.yml` | Release-triggered production deploy |
| `.github/dependabot.yml` | Dependency update bot |
| `.github/ISSUE_TEMPLATE/{bug,feature,config}.yml` | Issue templates |
| `.github/pull_request_template.md` | PR template |
| `.github/release.yml` | Release config |

Per `rebuild/AGENT.md` §4, edits to `.github/workflows/` require **explicit per-PR user approval**.

### `scripts/`

| File | Role |
|---|---|
| `scripts/todo-integration-smoke.sh` | Local Todo integration smoke check (used by `make test-integration`) |

---

## 9. Initial risks and notes for later phases

These are observations to feed Phase 2 audit tasks (`current-state.md`, `problems.md`, `keep-remove-defer.md`, `technical-debt.md`). They are **not decisions** — they are hooks for the audit phase.

1. **Frozen modules are deeply wired into `internal/platform/http/router.go`.** Removing them (Phase 7) is not a pure file deletion; the router must be edited in the same PR. Phase 6 must enumerate this.
2. **Frontend has no real tests.** `npm run test:run` and `npm run test:e2e` are placeholder `echo` calls. Phase 7.G will need to introduce a real test harness from scratch.
3. **Module registry is centralized.** `apps/web/src/shared/config/modules.ts` lists six modules that all currently appear on `/`. The Phase 7 "hide non-Todo navigation" step (7.0) can plausibly be implemented by filtering this registry plus pruning routes in `routes.tsx`.
4. **Backend route `/todo` already exists** as the auth success target. The rebuild's Todo UI should remain reachable at `/todo` (production users have it bookmarked) — this is a constraint, not a free choice, for Phase 5/6 design.
5. **Migrations preservation policy needs an ADR.** Migrations 5–7 (finance) and 11 (orchestrator) will outlive their Go code. The exact policy (keep tables idle, or `DROP` after backup) is intentionally deferred (spec §15.5) and must be captured in a Phase 7 ADR — referenced from refactor task 7.B.
6. **`apps/web/src/modules/tasks/` is the only `modules/` subdirectory.** The target frontend layout (`packages/domain`, `packages/ui`, `packages/config`, `apps/web`) is far from the current layout; the migration sequence in Phase 6 must spell out file-by-file moves.
7. **Single Go module, single binary.** The Phase 7 rename `apps/api/ → server/` is a single import path change (`apps/api/main.go` is currently only referenced from `docker-compose.yml`, the `Dockerfile`, and `Makefile`). Phase 6 should confirm this with `git grep`.
8. **Auth providers are over-configured for Todo-only scope.** Routing wires Yandex, GitHub, and VK — production only uses Yandex. Trimming providers is **out of scope** for this rebuild per `rebuild/AGENT.md` §2 ("Do not redesign auth in this rebuild"), but should be flagged in `docs/audit/technical-debt.md` (task 2.4).

---

## 10. How to use this map

- Looking for the **active Todo backend**? Start at [`internal/todo/`](../../internal/todo/) and the router mount at [`internal/platform/http/router.go:118-119`](../../internal/platform/http/router.go).
- Looking for the **active Todo frontend**? Start at [`apps/web/src/modules/tasks/TasksPage.tsx`](../../apps/web/src/modules/tasks/TasksPage.tsx) and route mounts at [`apps/web/src/app/routes.tsx:26-33`](../../apps/web/src/app/routes.tsx).
- Looking for **what gets deleted in Phase 1**? See §7 above and `rebuild/TASKS.md` task 1.5.
- Looking for **what gets deleted in Phase 7**? See §4 ("Frozen modules") and §5 ("FROZEN" entries) — exact slicing is the output of Phase 6 (task 6.1).
- Looking for **scripts**? See §3 (Makefile, npm scripts, integration smoke).
- Looking for **deployment / infra**? See §8 (deploy, infra, .github, scripts).

If any line in this snapshot disagrees with what you observe in the tree, **trust the tree** and update this file in a follow-up PR — it is a point-in-time snapshot, not a contract.
