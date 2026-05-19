# Current State — Phase 2 Audit (what works today)

> Read this together with [`rebuild/AGENT.md`](../../rebuild/AGENT.md), [`rebuild/TASKS.md`](../../rebuild/TASKS.md), and the Phase 0 snapshot in [`docs/audit/repo-map.md`](repo-map.md).
> Snapshot date: 2026-05-19.
> Scope: this document is **descriptive** — it records the behavior of the system as it stands at the start of the rebuild. Problems, risks, keep/remove/defer decisions, and technical-debt items live in `problems.md`, `keep-remove-defer.md`, and `technical-debt.md` (tasks 2.2–2.4, to be created in follow-up PRs).

---

## 1. Runtime architecture

The app ships as a **single Go binary** built from [`apps/api/main.go`](../../apps/api/main.go) plus a Vite-built React bundle that the same binary serves as static assets when `STATIC_DIR` is set.

Topology (production):

```text
Caddy (HTTPS, security headers, gzip)
  └── app:8080 (anton415-hub binary)
        ├── REST API at /api/v1/*
        └── SPA at /* (static from /app/web)
PostgreSQL 16 — same docker-compose stack (data store)
n8n + n8n-postgres — orchestrator workflows (frozen module)
```

The Go process mounts a `chi` router defined in [`internal/platform/http/router.go`](../../internal/platform/http/router.go). Middleware is intentionally minimal: `RequestID`, `RealIP`, a slog-based request logger, `Recoverer`, and a CORS layer keyed off `WEB_ORIGIN`. There is no rate-limiter middleware outside auth (auth wires its own; see §3).

Configuration is environment-driven via [`internal/platform/config/config.go`](../../internal/platform/config/config.go). Notable knobs: `DATABASE_URL`, `HTTP_ADDR`, `WEB_ORIGIN`, `STATIC_DIR`, the full `AUTH_*` family, and `ORCHESTRATOR_N8N_*` (frozen).

The same binary also serves `/health`, which actively pings PostgreSQL with a 2-second timeout and returns `503` when the DB is unreachable.

---

## 2. Todo flows (active scope of the rebuild)

The Todo backend implements two aggregates — **Projects** and **Tasks** — with a small ports-and-adapters layout under [`internal/todo/`](../../internal/todo/):

```text
internal/todo/
├── domain/       # Project, Task, errors, validation
├── application/  # Service, filters, sort, OptionalT update inputs
└── adapters/
    ├── http/        # chi router, request/response DTOs
    └── postgres/    # pgxpool implementation of both repositories
```

### 2.1 HTTP surface

All routes below sit behind session auth (`/api/v1/todo/*`, see §3). Defined in [`internal/todo/adapters/http/handler.go:38-55`](../../internal/todo/adapters/http/handler.go):

| Method | Path | Operation |
|---|---|---|
| `GET` | `/projects` | List projects (`include_archived`, `archived` filters) |
| `POST` | `/projects` | Create project |
| `PATCH` | `/projects/{id}` | Rename / re-parent / change date range |
| `PATCH` | `/projects/{id}/archive` | Archive project |
| `PATCH` | `/projects/{id}/restore` | Restore archived project |
| `DELETE` | `/projects/{id}` | Delete project |
| `GET` | `/tasks` | List tasks (`view`, `status`, `project_id`, `sort`, `direction`, `q`) |
| `POST` | `/tasks` | Create task |
| `PATCH` | `/tasks/{id}` | Partial update (JSON merge with explicit allowed-fields check) |
| `DELETE` | `/tasks/{id}` | Delete task |

Responses use a `{ "data": ... }` envelope; errors use `{ "error": { code, message } }` with explicit codes (`validation_error`, `not_found`, `project_has_tasks`, `payload_too_large`, etc.) mapped from domain errors.

The PATCH `/tasks/{id}` body validates unknown fields up front and uses a per-field `OptionalT{ Set, Value }` pattern so the client can `null`-clear a value vs. leave it untouched.

### 2.2 Domain model (as implemented)

`Task` ([`internal/todo/domain/task.go`](../../internal/todo/domain/task.go)):

- `Title` (required, trimmed, non-empty).
- `ProjectID *int64` (optional FK to `todo_projects`).
- `ParentTaskID *int64` (self-parent — supports subtasks).
- `Notes *string`, `URL *string` (URL normalized to `http`/`https` with hostname).
- `Status`: `todo` / `in_progress` / `done`. `CompletedAt` is set automatically when status becomes `done` and cleared otherwise (DB-level CHECK enforces the invariant).
- `Priority`: `none` / `low` / `medium` / `high`.
- `Flagged bool`.
- `DueDate *time.Time` (date-only) + `DueTime *string` (`HH:MM`, requires a `DueDate`).
- Recurrence: `RepeatFrequency` (`none`/`daily`/`weekdays`/`weekends`/`weekly`/`monthly`/`yearly`), `RepeatInterval`, `RepeatUntil`. Active recurrence requires a `DueDate`.

`Project` ([`internal/todo/domain/project.go`](../../internal/todo/domain/project.go)):

- `Name` (required, trimmed).
- `ParentProjectID *int64` (self-parent — supports nested projects). Cycles and self-parenting are rejected by the service layer ([`service.go:352-381`](../../internal/todo/application/service.go:352)).
- `StartDate`, `EndDate` (optional, `start ≤ end`).
- `Archived bool`.

### 2.3 Task views and sort

`TaskView` ([`internal/todo/application/filter.go:14-30`](../../internal/todo/application/filter.go:14)): `inbox`, `today`, `upcoming`, `overdue`, `scheduled`, `flagged`. Implemented behaviors:

| View | Filter |
|---|---|
| `inbox` | No project AND not done |
| `today` | Due date ≤ today AND not done |
| `upcoming` | Due date > today AND not done |
| `overdue` | Past-due (date or, if today + due time set, time-of-day) AND not done |
| `scheduled` | Has a due date AND not done |
| `flagged` | `flagged = true` AND not done |

Sort modes: `smart` (default), `due`, `created`, `title`, `priority`; direction `asc`/`desc`. The `smart` sort always pushes `done` to the bottom, then orders by due date, then by priority, then by `flagged`, then by newest created.

### 2.4 Task lifecycle and recurrence

- Marking a task `done` on a non-recurring task sets `CompletedAt = now` and `Status = done`.
- Marking a task `done` on a recurring task with a `DueDate` advances the `DueDate` to the next matching date and keeps `Status = todo`. The next-date computation honors `daily` / `weekdays` / `weekends` / `weekly` / `monthly` / `yearly` with the given `RepeatInterval` and stops at `RepeatUntil` (after which the task is finally closed). Logic lives in [`task.go:292-373`](../../internal/todo/domain/task.go:292).
- Re-opening a `done` task clears `CompletedAt`.

### 2.5 Frontend (Todo UI)

Located under [`apps/web/src/modules/tasks/`](../../apps/web/src/modules/tasks/). The page composition is:

- [`TasksPage.tsx`](../../apps/web/src/modules/tasks/TasksPage.tsx) — top-level layout, scope state, quick-create field, modals.
- `TaskSidebar` — view list (the eight entries from [`lib/constants.ts:22-31`](../../apps/web/src/modules/tasks/lib/constants.ts:22): `inbox`, `today`, `overdue`, `upcoming`, `scheduled`, `flagged`, `all`, `completed`) and project tree.
- `TaskList` + `TaskListItem` + `TaskSubtasks` — list rendering with hierarchical subtasks built from the flat list via [`lib/buildTree.ts`](../../apps/web/src/modules/tasks/lib/buildTree.ts).
- `TaskEditSheet` — side sheet for full task editing.
- `ProjectDialog` — create / edit / delete project modals.
- State is local React state inside two hooks ([`hooks/useTasks.ts`](../../apps/web/src/modules/tasks/hooks/useTasks.ts), [`hooks/useProjects.ts`](../../apps/web/src/modules/tasks/hooks/useProjects.ts)) talking to the API via [`apps/web/src/app/api/todoApi.ts`](../../apps/web/src/app/api/todoApi.ts). There is no global store (no Redux, no Zustand, no React Query).
- Access is gated by [`useAuthGate`](../../apps/web/src/app/hooks/useAuthGate.ts), which polls `/api/v1/me` and redirects to `/login` on failure.

The UI is in Russian. Routes [`/tasks`](../../apps/web/src/app/routes.tsx:26) and [`/todo`](../../apps/web/src/app/routes.tsx:30) both render the same `TasksPage`; the backend's post-login redirect sends users to `/todo`.

---

## 3. Authentication

Auth implementation: [`internal/auth/`](../../internal/auth/). Wiring: [`internal/platform/http/router.go:68-124`](../../internal/platform/http/router.go:68).

### 3.1 Surface

OAuth and email routes are mounted at `/api/v1/auth/` ([`internal/auth/adapters/http/handler.go:48-58`](../../internal/auth/adapters/http/handler.go:48)). `/me` is mounted directly under `/api/v1/` inside the session-middleware group ([`router.go:115`](../../internal/platform/http/router.go:115)).

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/auth/providers` | List configured OAuth providers |
| `GET` | `/api/v1/auth/{provider}/start` | Begin OAuth flow (issues `state`, redirects to provider) |
| `GET` | `/api/v1/auth/{provider}/callback` | OAuth callback — exchanges code, creates session, sets cookie, redirects |
| `POST` | `/api/v1/auth/email/start` | Magic-link login (SMTP) |
| `GET` | `/api/v1/auth/email/verify` | Magic-link verification |
| `POST` | `/api/v1/auth/logout` | Revoke session cookie |
| `GET` | `/api/v1/me` | Return current `Principal` or `{ authenticated: false }` |

`SessionMiddleware` reads the session cookie, hashes it, looks up an active `auth_sessions` row, and attaches a `Principal{ Email, Provider }` to the context. `RequireAuthenticated` returns `401` when no principal is present.

### 3.2 Providers

The router pre-wires three providers ([`router.go:151-185`](../../internal/platform/http/router.go:151)):

- **Yandex ID** — `EmailTrusted: true`. **This is the production path.** `anton415.ru` users sign in here.
- **GitHub** — `EmailTrusted: true`. Wired but not used in production.
- **VK ID** — `EmailTrusted: false`. Wired but not used in production.

The magic-link flow is functional when both `SMTP_HOST` and `EMAIL_FROM` are configured (`router.go:133-143`); otherwise email login is disabled at startup.

### 3.3 Allow-list, session lifetime, and dev bypass

- Access is restricted to the comma-separated `AUTH_ALLOWED_EMAILS`. Anything else is rejected with `ErrEmailNotAllowed`.
- Sessions default to **30 days** (`AUTH_SESSION_TTL`, override per env); email tokens default to 15 minutes (`AUTH_TOKEN_TTL`).
- `AUTH_DEV_BYPASS=true` in `docker-compose.yml` short-circuits the middleware to a fake `dev@localhost` principal so local development doesn't require OAuth credentials. Production sets it to `false` via `deploy.yml`.
- An IP-keyed rate limiter sits in front of `/auth/{provider}/start` and `/email/start` ([`internal/auth/adapters/http/rate_limit.go`](../../internal/auth/adapters/http/rate_limit.go)). Defaults: 60 req/min locally, 10 req/min in production.

### 3.4 Cookie

- Name configurable via `AUTH_SESSION_COOKIE` (production: `anton415_hub_session`).
- HttpOnly, `SameSite=Lax`. `Secure` is on in production (`AUTH_COOKIE_SECURE=true`).
- Value is the random session token; the server only stores its SHA-256 hash.

---

## 4. Persistence

The single PostgreSQL 16 instance is the only data store. The Go code uses `pgxpool` ([`internal/platform/db/db.go`](../../internal/platform/db/db.go)).

### 4.1 Schema (Todo + auth — the parts in the active scope)

`todo_projects` columns evolved across migrations into:

- `id BIGSERIAL` PK, `parent_project_id BIGINT NULL` (FK to self, `ON DELETE SET NULL`, with `parent_project_id <> id` check).
- `name TEXT NOT NULL` (`length(trim(name)) > 0`).
- `start_date DATE NULL`, `end_date DATE NULL`, `archived BOOLEAN NOT NULL`.
- `created_at`, `updated_at TIMESTAMPTZ`.

`todo_tasks`:

- `id BIGSERIAL` PK.
- `project_id BIGINT NULL` (FK `todo_projects(id) ON DELETE RESTRICT`).
- `parent_task_id BIGINT NULL` (FK to self, `ON DELETE SET NULL`, with `parent_task_id <> id` check).
- `title TEXT NOT NULL` (`length(trim(title)) > 0`).
- `notes TEXT NULL`, `url TEXT NULL` (added in `000008_task_url`).
- `status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done'))`.
- `priority TEXT`, `flagged BOOLEAN`, `due_date DATE`, `due_time TEXT`.
- Recurrence: `repeat_frequency` (constrained to the 7 values listed in §2.2), `repeat_interval`, `repeat_until`.
- `created_at`, `updated_at`, `completed_at TIMESTAMPTZ NULL` — with a table-level CHECK keeping `completed_at NOT NULL` iff `status = 'done'`.
- Indexes on `project_id`, `status`, `due_date` (partial, `WHERE due_date IS NOT NULL`), and `parent_task_id` (partial).

A seed row `("Архив", archived=false)` is inserted by `000010_todo_hierarchy_archive_recurrence` if no project with that name (case-insensitive) exists.

Auth schema (`000003_create_auth`):

- `auth_sessions(token_hash UNIQUE, email, provider, created_at, expires_at, last_seen_at, revoked_at)` with a partial index on `(token_hash, expires_at) WHERE revoked_at IS NULL`.
- `auth_oauth_states(state_hash PK, provider, code_verifier, redirect_path, created_at, expires_at, used_at)`.
- `auth_email_tokens(token_hash PK, email, created_at, expires_at, used_at)`.

Note: session tokens, OAuth state, and email tokens are all stored **hashed**, never in plain text.

### 4.2 Migrations

11 numbered `.up.sql`/`.down.sql` pairs under [`migrations/`](../../migrations/), applied by `migrate/migrate:v4.18.3` via docker-compose. Inventory and ownership (frozen vs active) is listed in [`docs/audit/repo-map.md` §6](repo-map.md). The Todo-relevant migrations are `000002`, `000004`, `000008`, `000009`, `000010`.

### 4.3 Production data path

- Backup script: [`deploy/backup/pg_dump_to_object_storage.sh`](../../deploy/backup/pg_dump_to_object_storage.sh) — `pg_dump` → Yandex Object Storage.
- Migration script on the production VM: [`deploy/migrate-production.sh`](../../deploy/migrate-production.sh) and the inline `MIGRATE` heredoc in [`deploy.yml`](../../.github/workflows/deploy.yml) (`PGPASSWORD=… docker compose run --rm migrate up`).
- First-time bootstrap path in `deploy.yml` performs a one-shot `pg_dump`/`psql` import from the legacy `/opt/anton415-os` deployment, then writes the marker file `.anton415-hub-db-migrated`.

---

## 5. Build, lint, test, and CI

### 5.1 Local commands

[`Makefile`](../../Makefile) is the canonical task runner. It transparently routes through `golang:1.25-alpine` via Docker when `go`/`gofmt` are not on `PATH`. Active targets relevant to Todo:

| Target | Effect |
|---|---|
| `make dev` | `docker compose up postgres api web` — full local stack |
| `make api` | API + Postgres only |
| `make web` | `npm install && npm run dev` in `apps/web/` |
| `make db` | Postgres only |
| `make test` | `go test ./...` then `npm run test:run` |
| `make test-e2e` | `npm run test:e2e` |
| `make test-integration` | [`scripts/todo-integration-smoke.sh`](../../scripts/todo-integration-smoke.sh) |
| `make lint` | `gofmt -l` (must be empty) → `go vet ./...` → `tsc --noEmit` |
| `make build` | `go build ./...` + `vite build` |
| `make docker-build` | `docker build -t anton415-hub:local .` |
| `make migrate-up` / `migrate-down` | `golang-migrate` up / down 1 |

What runs today vs. what is a placeholder:

- `go test ./...` runs **real tests**. Coverage is concentrated in `internal/todo/{domain,application,adapters/http,adapters/postgres}` and `internal/auth/{service,adapters/http}` (see `_test.go` files in those directories).
- `npm run check` runs `tsc --noEmit` (real typecheck).
- `npm run build` runs `tsc --noEmit && vite build`.
- `npm run test:run` and `npm run test:e2e` are **placeholder `echo` lines** in [`apps/web/package.json:13-14`](../../apps/web/package.json:13). They exit 0 without doing anything. Frontend tests do not currently exist.
- `scripts/todo-integration-smoke.sh` brings up `postgres` + `migrate` + `api`, injects a session row directly into `auth_sessions`, then exercises Todo create/list/archive/restore endpoints over HTTP against `localhost:8080`. It is the closest thing to an end-to-end check that runs today.

### 5.2 CI

[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) runs on every PR and on push to `main`:

- **Backend job**: `gofmt` check → `go vet ./...` → `go test ./...` → `go build ./...`.
- **Frontend job**: `npm ci` → `npm run check` → `npm run test:run` → `npm run build` → `npx playwright install --with-deps chromium` → `npm run test:e2e`.
  - The Playwright install and `test:e2e` step run, but since `test:e2e` is the `echo` placeholder, no browser is actually driven. The install does still happen each run.
- **Container job** (needs backend + frontend): `docker buildx` build of the production `Dockerfile`, `push: false, load: true` (smoke build only).

---

## 6. Deploy

Production environment: a single Yandex Cloud VM provisioned by [`infra/terraform/`](../../infra/terraform/), running docker-compose with five services (`postgres`, `n8n-postgres`, `app`, `n8n`, `caddy`) plus the on-demand `migrate` container.

### 6.1 Trigger and image build

[`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml) runs on GitHub `release` events (and supports manual `workflow_dispatch`):

1. Resolve the image tag (release tag, or `inputs.image_tag`, or the short SHA).
2. Build the multi-stage [`Dockerfile`](../../Dockerfile) (`node:24-alpine` → Vite build, `golang:1.25-alpine` → Go build, final `alpine:3.21` image).
3. Push to Yandex Container Registry under `cr.yandex/<registry-id>/anton415-hub:<tag>` and `:main`.

### 6.2 Deploy to the VM

Same workflow then opens a temporary SSH ingress rule scoped to the GitHub runner's `/32` (revoked in the `always()` cleanup step) and SSHes to the VM as the deploy user. On the VM the script:

1. Writes/updates `app.env`, `postgres.env`, `n8n.env`, `n8n-postgres.env` in `/opt/anton415-hub/`.
2. Pulls secrets from **Yandex Lockbox** via the instance metadata service into `secrets.env` (chmod `0600`). Lockbox is the source of truth for production credentials (`POSTGRES_PASSWORD`, OAuth client IDs/secrets, callback tokens, OpenAI/Anthropic keys, etc.).
3. Generates the production `docker-compose.yml` (heredoc in the workflow), the Caddy `Caddyfile` (HTTPS, security headers, CSP), and the migration helper script.
4. Pulls the new image, copies `/app/migrations` and the n8n workflow JSON out of the image onto the VM.
5. Runs `migrate up` against the production database.
6. Imports/updates the orchestrator n8n workflow (frozen module).
7. `docker compose up -d --no-deps --force-recreate` for `n8n`, then `app`, then `caddy`.
8. Hits `/health` from inside the `app` container as a deploy smoke check.
9. Prunes dangling images.
10. Revokes the temporary SSH ingress rule.

### 6.3 Edge layer

Caddy 2.8 terminates HTTPS for `anton415.ru`, reverse-proxies to `app:8080`, and applies a fixed security header set: CSP (`default-src 'self'; …`), HSTS (`max-age=31536000`), `X-Frame-Options DENY`, `X-Content-Type-Options nosniff`, `Permissions-Policy`, `Referrer-Policy same-origin`. Gzip/zstd encoding is enabled.

---

## 7. What is intentionally **not** covered here

Per the Phase 2 split in [`rebuild/TASKS.md`](../../rebuild/TASKS.md):

- **Problems, failures, AI-readability blockers, risks** → `docs/audit/problems.md` (task 2.2).
- **Keep / remove / defer decisions per area** → `docs/audit/keep-remove-defer.md` (task 2.3).
- **Concrete technical-debt items with impact and proposed cleanup phase** → `docs/audit/technical-debt.md` (task 2.4).
- **Phase 7 refactor moves and slicing** → output of Phase 6 (task 6.1).

Frozen modules (`finance`, `orchestrator`, `fire`, `investments`, plus their frontend pages) and the n8n integration are documented in [`docs/audit/repo-map.md` §4–§5](repo-map.md) and will be revisited in Phase 7. They are intentionally **not** described here because this document is about what the rebuild's active scope (Todo + auth + persistence + build + deploy) does today.
