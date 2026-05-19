# Keep / Remove / Defer — Phase 2 Audit (explicit decisions per area)

> Read this together with [`rebuild/AGENT.md`](../../rebuild/AGENT.md), [`rebuild/TASKS.md`](../../rebuild/TASKS.md), the Phase 0 snapshot in [`docs/audit/repo-map.md`](repo-map.md), the descriptive companion [`docs/audit/current-state.md`](current-state.md), and the diagnostic companion [`docs/audit/problems.md`](problems.md).
> Snapshot date: 2026-05-19.
> Scope split: this file is **decisional** — for every meaningful area in the repository it records one of four verdicts (**Keep**, **Remove**, **Defer**, **Rewrite**) with the phase that owns the change. The "why" lives in `problems.md`; the "when, with what impact" lives in `technical-debt.md` (task 2.4, pending). Items here can be referenced from both.

---

## 1. Decision rubric

Every row uses one of four verdicts.

| Verdict | Meaning | Phase that owns it |
|---|---|---|
| **Keep** | Stays as-is. May be re-examined later, but not changed during this rebuild. | — |
| **Rewrite** | Stays in the product but the implementation is replaced during this rebuild. | Phase 6 plan → Phase 7 sub-tasks |
| **Remove** | Code, config, doc, or surface that disappears during this rebuild. | Phase 1 (docs) or Phase 7 (code) |
| **Defer** | A real concern that is intentionally out of scope for this rebuild. Recorded so it is not forgotten. | Recorded only |

Anchor rules that bind these decisions:

- Only **Todo** is in active scope ([`rebuild/AGENT.md` §2](../../rebuild/AGENT.md), spec [§15.1](../../rebuild/todo_hub_ai_first_rebuild_spec.md#151-active-scope)).
- Backend stays on Go; `apps/api/ → server/` move is a Phase 7 slice (spec [§15.2](../../rebuild/todo_hub_ai_first_rebuild_spec.md#152-backend)).
- Frontend stays on Vite + React + TS + Tailwind v4; target layout is the `packages/domain | ui | config` + `apps/web` monorepo (spec [§15.3](../../rebuild/todo_hub_ai_first_rebuild_spec.md#153-frontend)).
- Auth is **not** redesigned. Items that touch auth are either **Keep** or **Defer** unless explicitly listed in §15.
- Production at `anton415.ru` must remain runnable on every merge until the Phase 7 slices begin (spec [§15.5](../../rebuild/todo_hub_ai_first_rebuild_spec.md#155-production-safety)).
- Migrations are preserved in place; the keep-tables-vs-drop choice for frozen modules is deferred to a Phase 7 ADR (spec §15.5).

If a decision below conflicts with `rebuild/AGENT.md` or §15 of the spec, **AGENT.md / §15 win** — open a follow-up PR to correct this file.

---

## 2. Backend code — `internal/`, `apps/api/`

### 2.1 Active Todo backend

| Area | Verdict | Phase | Note |
|---|---|---|---|
| [`internal/todo/domain/`](../../internal/todo/domain/) — `Task`, `Project`, errors, validation | **Rewrite** | Phase 6 plan → Phase 7.D | Domain logic stays but moves into the `packages/domain` boundary; `task.go` is split (entity vs recurrence vs URL normalization) per [`problems.md` §2.4](problems.md). |
| [`internal/todo/application/`](../../internal/todo/application/) — service, filters, `OptionalT` PATCH | **Rewrite** | Phase 6 plan → Phase 7.D | Service keeps shape; PATCH-merge approach (`OptionalT` vs JSON merge patch vs typed RPC) is decided in Phase 3 [`api-contract.md`](../system-design/api-contract.md). |
| [`internal/todo/adapters/http/`](../../internal/todo/adapters/http/) — chi router + DTOs (handler.go = 736 lines) | **Rewrite** | Phase 6 plan → Phase 7.C–D | Same surface, smaller files, contract-tested. Splits along DTOs / decoding / error mapping / route registration seams. |
| [`internal/todo/adapters/postgres/`](../../internal/todo/adapters/postgres/) — pgxpool repository (562 lines) | **Rewrite** | Phase 6 plan → Phase 7.D | Same schema, smaller files (Projects vs Tasks repository split). Behavior must stay bit-compatible — production rows already exist. |
| Tests in `internal/todo/**/_test.go` | **Keep** | — | Coverage is the only safety net for the rewrite. Tests are migrated 1:1 alongside the code in the Phase 7 slice that moves the package. |
| `apps/api/main.go` (single Go entry point) | **Rewrite** | Phase 7.C | Moves to `server/main.go` per spec §15.2. Behavior unchanged; only import paths, Dockerfile, docker-compose, and Makefile references update. |

### 2.2 Auth backend

| Area | Verdict | Phase | Note |
|---|---|---|---|
| [`internal/auth/service.go`](../../internal/auth/service.go), [`smtp_sender.go`](../../internal/auth/smtp_sender.go) | **Keep** | — | Auth is explicitly out of scope (`AGENT.md` §2). |
| [`internal/auth/adapters/http/`](../../internal/auth/adapters/http/) — providers handler, rate limiter, session middleware | **Keep** | — | Production path. Same applies. |
| [`internal/auth/adapters/postgres/repository.go`](../../internal/auth/adapters/postgres/repository.go) | **Keep** | — | Schema lives in `migrations/000003_create_auth`. Untouched. |
| Yandex ID provider | **Keep** | — | Production users authenticate here. |
| GitHub OAuth provider wiring | **Defer** | — | Wired in [`router.go:151-185`](../../internal/platform/http/router.go), not used in production ([`problems.md` §2.8](problems.md)). Removal would be an auth-surface change; this rebuild does not touch auth. Recorded for a future cleanup pass. |
| VK ID OAuth provider wiring | **Defer** | — | Same rationale as GitHub. |
| Magic-link email login (`/auth/email/*`) | **Defer** | — | Functional when SMTP is configured; not used in production. Decision deferred — auth not redesigned here. |
| Auth rate limiter ([`rate_limit.go`](../../internal/auth/adapters/http/rate_limit.go)) | **Keep** | — | Production safety control. |
| `AUTH_DEV_BYPASS` middleware default (`true` in `docker-compose.yml`) | **Defer** | — | Item [`problems.md` §1.5](problems.md): insecure-by-default but production overrides to `false`. Flip lands together with a real local-session story; that work is outside this rebuild and is recorded as [`technical-debt.md`](technical-debt.md) (pending). |

### 2.3 Platform code

| Area | Verdict | Phase | Note |
|---|---|---|---|
| [`internal/platform/config/`](../../internal/platform/config/) | **Keep** | — | Single source of env-driven config. Will adopt knobs that disappear with frozen modules but the package itself stays. |
| [`internal/platform/db/`](../../internal/platform/db/) (`pgxpool`) | **Keep** | — | One Postgres, one pool, no migration planned. |
| [`internal/platform/http/router.go`](../../internal/platform/http/router.go) — chi composition + middleware | **Rewrite** | Phase 7.B–C | Frozen-module mounts come out in lockstep with the modules ([`problems.md` §3.1](problems.md)). The router file as a whole is rebuilt alongside the `server/` move so the result is small enough to fit `AI-First` size guidance. |
| [`internal/platform/http/middleware/`](../../internal/platform/http/) — RequestID, RealIP, slog logger, Recoverer, CORS | **Keep** | — | Behavior is fine and minimal. |
| [`internal/platform/httpjson/`](../../internal/platform/httpjson/) — JSON helpers, tests | **Keep** | — | Shared utility. Stays in the platform package after the rewrite. |
| [`internal/platform/logging/`](../../internal/platform/logging/) | **Keep** | — | slog wrapper — keep. |

### 2.4 Frozen-module Go code

| Area | Verdict | Phase | Note |
|---|---|---|---|
| [`internal/finance/`](../../internal/finance/) — domain, application, adapters/http, adapters/postgres + tests | **Remove** | Phase 7.B | Per `AGENT.md` §2 and spec §15.1. Mount in `router.go` is removed in the same PR. |
| [`internal/orchestrator/`](../../internal/orchestrator/) — domain, application, adapters/http, adapters/postgres, **`adapters/n8n/client.go`** | **Remove** | Phase 7.B | Removed together. The `/api/v1/orchestrator/n8n` callback router (currently mounted without session middleware, see [`problems.md` §3.1](problems.md)) goes with it. |
| [`internal/investments/doc.go`](../../internal/investments/doc.go) — package marker only | **Remove** | Phase 7.B | Placeholder. |
| [`internal/fire/doc.go`](../../internal/fire/doc.go) — package marker only | **Remove** | Phase 7.B | Placeholder. |
| `internal/calendar/` | n/a | — | Not present in `internal/`. Calendar only exists on the frontend as `CalendarComingSoon.tsx`. |

---

## 3. Frontend code — `apps/web/`

### 3.1 Active Todo frontend

| Area | Verdict | Phase | Note |
|---|---|---|---|
| [`apps/web/src/modules/tasks/`](../../apps/web/src/modules/tasks/) — `TasksPage`, `TaskList`, `TaskListItem`, `TaskEditSheet`, `TaskSidebar`, `ProjectDialog`, `TaskSubtasks` | **Rewrite** | Phase 7.E | UI is redesigned per the Phase 5 brief. Behavior contract (recurrence, views, subtasks) must match what `current-state.md` §2 documents — the redesign is presentational, not behavioral. |
| [`hooks/useTasks.ts`](../../apps/web/src/modules/tasks/hooks/useTasks.ts), [`hooks/useProjects.ts`](../../apps/web/src/modules/tasks/hooks/useProjects.ts) | **Rewrite** | Phase 7.D | Migrated into `packages/domain` (or the chosen frontend boundary in Phase 6) once `packages/*` exist. Logic stays. |
| [`lib/buildTree.ts`](../../apps/web/src/modules/tasks/lib/buildTree.ts), [`lib/constants.ts`](../../apps/web/src/modules/tasks/lib/constants.ts), [`lib/payloads.ts`](../../apps/web/src/modules/tasks/lib/payloads.ts), [`lib/describeError.ts`](../../apps/web/src/modules/tasks/lib/describeError.ts) | **Rewrite** | Phase 7.D | Same — moved into `packages/domain`. `buildTree` becomes a domain-package export so the redesign can re-use it. |
| [`apps/web/src/app/api/todoApi.ts`](../../apps/web/src/app/api/todoApi.ts) | **Rewrite** | Phase 7.D | Replaced by the contract chosen in Phase 3 [`api-contract.md`](../system-design/api-contract.md). |
| [`apps/web/src/app/api/client.ts`](../../apps/web/src/app/api/client.ts), [`authApi.ts`](../../apps/web/src/app/api/authApi.ts), [`types.ts`](../../apps/web/src/app/api/types.ts), [`index.ts`](../../apps/web/src/app/api/index.ts) | **Keep** | — | Auth client stays (no auth redesign). Generic fetch client is reusable. |
| [`apps/web/src/app/api/financeApi.ts`](../../apps/web/src/app/api/financeApi.ts), [`financeFormat.ts`](../../apps/web/src/app/api/financeFormat.ts), [`orchestratorApi.ts`](../../apps/web/src/app/api/orchestratorApi.ts) | **Remove** | Phase 7.A | Frozen-module API clients. |
| [`apps/web/src/app/components/Dashboard.tsx`](../../apps/web/src/app/components/Dashboard.tsx) — module grid | **Rewrite** | Phase 7.0 → Phase 7.E | Six-tile grid is reduced to the Todo entry only (Phase 7.0 hides everything else), then the post-redesign navigation replaces it entirely. |
| [`apps/web/src/app/components/LoginPage.tsx`](../../apps/web/src/app/components/LoginPage.tsx) | **Keep** | — | Auth UI stays untouched. |
| [`apps/web/src/app/components/ui/`](../../apps/web/src/app/components/ui/) — Radix primitives | **Keep** | — | Reused by the Todo redesign. Some primitives may migrate to `packages/ui` in Phase 6. |
| [`apps/web/src/app/hooks/useAuthGate.ts`](../../apps/web/src/app/hooks/useAuthGate.ts) | **Keep** | — | Auth-gate logic — stays. |
| [`apps/web/src/app/layouts/AppShell.tsx`](../../apps/web/src/app/layouts/AppShell.tsx) | **Rewrite** | Phase 7.E | Top-bar / nav rebuilt as part of the redesign so the "Todo-only" surface is the only thing exposed. |
| [`apps/web/src/app/App.tsx`](../../apps/web/src/app/App.tsx), [`ErrorBoundary.tsx`](../../apps/web/src/app/ErrorBoundary.tsx), [`main.tsx`](../../apps/web/src/main.tsx) | **Keep** | — | Bootstrap — unchanged. |
| [`apps/web/src/app/routes.tsx`](../../apps/web/src/app/routes.tsx) | **Rewrite** | Phase 7.0 → Phase 7.E | All non-Todo routes deleted; Todo routes moved into `apps/web` per the Phase 6 plan. |

### 3.2 Frozen-module frontend code

| Area | Verdict | Phase | Note |
|---|---|---|---|
| [`apps/web/src/app/components/FinancesPage.tsx`](../../apps/web/src/app/components/FinancesPage.tsx) | **Remove** | Phase 7.A | Per `AGENT.md` §2. Route removed alongside. |
| [`apps/web/src/app/components/CalendarComingSoon.tsx`](../../apps/web/src/app/components/CalendarComingSoon.tsx) | **Remove** | Phase 7.A | Placeholder. |
| [`apps/web/src/app/components/orchestrator/`](../../apps/web/src/app/components/orchestrator/) — `OrchestratorHomePage`, `OrchestratorProjectsPage`, `OrchestratorWorkflowPage`, `shared.tsx` | **Remove** | Phase 7.A | Removed together with the backend orchestrator module. |
| Inline `/investments` and `/fire` placeholder `<div>`s in `routes.tsx` | **Remove** | Phase 7.0 → Phase 7.A | Hidden in 7.0, deleted in 7.A. |
| Module registry entries for `finances`, `investments`, `fire`, `calendar`, `orchestrator` in [`shared/config/modules.ts`](../../apps/web/src/shared/config/modules.ts) | **Remove** | Phase 7.0 | Phase 7.0 prunes the registry to `tasks` so production stops claiming frozen modules ([`problems.md` §1.4](problems.md)). |

### 3.3 Routing duplicates and canonical path

| Area | Verdict | Phase | Note |
|---|---|---|---|
| Both `/tasks` and `/todo` mounted on `TasksPage` ([`problems.md` §2.9](problems.md)) | **Defer to Phase 5/6** | Phase 5 design / Phase 6 plan | Decision postponed until the redesign picks a canonical path. `/todo` is the post-login redirect target and a bookmark for production users — it stays at minimum as an alias. |

### 3.4 Styling and design tokens

| Area | Verdict | Phase | Note |
|---|---|---|---|
| [`apps/web/src/styles/index.css`](../../apps/web/src/styles/index.css), [`tailwind.css`](../../apps/web/src/styles/tailwind.css), [`theme.css`](../../apps/web/src/styles/theme.css) + `class-variance-authority` | **Rewrite** | Phase 5 design → Phase 7.E | Tokens and component inventory are pinned down in Phase 5 ([`problems.md` §2.7](problems.md)). The CSS files survive in some form; the rules they encode are rewritten against a documented token set. |

### 3.5 Frontend tests

| Area | Verdict | Phase | Note |
|---|---|---|---|
| `apps/web` unit tests | **Rewrite** | Phase 7.G | None exist today ([`problems.md` §1.1](problems.md)). The `echo` placeholders in [`apps/web/package.json:13-14`](../../apps/web/package.json:13) are replaced with a real Vitest harness. |
| `apps/web` end-to-end tests | **Rewrite** | Phase 7.G | Same — Playwright is already installed by CI; the test files are new. |
| ESLint, Prettier, Stylelint, a11y lint | **Rewrite** | Phase 7.G | None configured today ([`problems.md` §1.6](problems.md)). At minimum: ESLint with `react-hooks` and `jsx-a11y` rules. |

---

## 4. Database — `migrations/`, schema, data path

| Area | Verdict | Phase | Note |
|---|---|---|---|
| Single PostgreSQL 16 instance | **Keep** | — | One data store. No second DB planned. |
| Active Todo migrations: `000002`, `000004`, `000008`, `000009`, `000010` | **Keep** | — | They define the production schema. Untouched. |
| Auth migration: `000003_create_auth` | **Keep** | — | Production auth schema. |
| Platform migration: `000001_create_platform_metadata` | **Keep** | — | Bootstrap migration. |
| Frozen-module migrations: `000005_create_finance`, `000006_income_components`, `000007_finance_settings`, `000011_create_orchestrator` | **Defer** | Phase 7 ADR | Files stay in `migrations/` per spec §15.5. Whether the **tables** are dropped-with-backup or kept idle is the subject of a Phase 7 ADR — referenced from refactor task 7.B. Recorded in [`problems.md` §3.2](problems.md). |
| Down-migration rehearsal (esp. `000010_todo_hierarchy_archive_recurrence`) | **Defer** | Phase 6 / Phase 8 | Per-slice rollback expectations are documented in [`docs/refactor/todo-architecture-refactor-plan.md`](../refactor/todo-architecture-refactor-plan.md) (task 6.1); rehearsal is recorded in Phase 8 ([`problems.md` §3.4](problems.md)). |
| Backup script [`deploy/backup/pg_dump_to_object_storage.sh`](../../deploy/backup/pg_dump_to_object_storage.sh) | **Keep** | — | Production backup path. Restore drill is a Phase 8.4 deliverable. |
| Production migration runner [`deploy/migrate-production.sh`](../../deploy/migrate-production.sh) + inline `MIGRATE` heredoc in [`deploy.yml`](../../.github/workflows/deploy.yml) | **Keep** | — | Untouched in this rebuild. Any change requires explicit per-PR approval per `AGENT.md` §4. |

---

## 5. Configuration, deploy, infra, CI

### 5.1 Local dev configuration

| Area | Verdict | Phase | Note |
|---|---|---|---|
| [`docker-compose.yml`](../../docker-compose.yml) — postgres + api + web + migrate + n8n services | **Rewrite** | Phase 7.B–C | Trimmed to `postgres + api + web + migrate` once `internal/orchestrator/` is deleted (n8n service goes with it). The `apps/api/ → server/` move requires updating the `app.build.context` / Dockerfile reference. Every change here requires explicit per-PR approval. |
| `AUTH_DEV_BYPASS: ${AUTH_DEV_BYPASS:-true}` default in `docker-compose.yml:40` | **Defer** | — | See §2.2 above. |
| [`.env.example`](../../.env.example) | **Rewrite** | Phase 7.A–B | Drops `ORCHESTRATOR_N8N_*` and finance-specific knobs after their modules are removed. Auth provider blocks (`AUTH_GITHUB_*`, `AUTH_VK_*`) stay — they are `Defer`. |
| [`Dockerfile`](../../Dockerfile) — multi-stage `node:24-alpine` + `golang:1.25-alpine` + `alpine:3.21` | **Rewrite** | Phase 7.C | Updated when `apps/api/ → server/` lands. Image structure stays the same. Requires explicit per-PR approval. |
| [`Makefile`](../../Makefile) | **Rewrite** | Phase 7.C–G | Targets stay; the underlying paths and the placeholder `test:run` / `test:e2e` chains are rewritten when 7.G lands. |

### 5.2 CI

| Area | Verdict | Phase | Note |
|---|---|---|---|
| [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) — backend + frontend + container jobs | **Rewrite** | Phase 7.G | Frontend job replaces `echo` placeholders with real test commands. Playwright install is justified only after a real e2e test exists ([`problems.md` §1.2](problems.md)). Every change requires explicit per-PR approval per `AGENT.md` §4. |
| Backend job (`gofmt`, `go vet`, `go test`, `go build`) | **Keep** | — | The signal is honest. `golangci-lint` may be added later per spec §15.2; that's a small follow-up, not a rewrite. |
| Container job (`docker buildx`, `push: false, load: true`) | **Keep** | — | Smoke build is fine. |
| [`.github/dependabot.yml`](../../.github/dependabot.yml) | **Keep** | — | Routine dependency PRs continue. |
| [`.github/ISSUE_TEMPLATE/`](../../.github/ISSUE_TEMPLATE/), [`pull_request_template.md`](../../.github/pull_request_template.md), [`release.yml`](../../.github/release.yml) | **Keep** | — | Issue/PR housekeeping. |

### 5.3 Deploy

| Area | Verdict | Phase | Note |
|---|---|---|---|
| [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml) — release-triggered Yandex Cloud deploy | **Rewrite** | Phase 7.B–C | The inline `docker-compose.yml` heredoc and the `app.env`/`n8n.env` generation must drop the n8n service together with `internal/orchestrator/`. Requires explicit per-PR approval. |
| Yandex Lockbox secret sync (via [`deploy/lockbox-sync.sh`](../../deploy/lockbox-sync.sh) and inline in `deploy.yml`) | **Keep** | — | Production secret source of truth. |
| [`deploy/docker-compose.production.yml`](../../deploy/docker-compose.production.yml) | **Rewrite** | Phase 7.B–C | Same as above — trim with frozen modules. |
| [`deploy/caddy/Caddyfile`](../../deploy/caddy/Caddyfile) — HTTPS, CSP, HSTS, etc. | **Keep** | — | Edge config is correct and minimal. |
| [`deploy/n8n/`](../../deploy/n8n/) — workflow JSON + README | **Remove** | Phase 7.B | Removed alongside the orchestrator module. |
| [`deploy/README.md`](../../deploy/README.md) | **Rewrite** | Phase 7.B–C | Production runbook updated to reflect the trimmed stack. |

### 5.4 Infra

| Area | Verdict | Phase | Note |
|---|---|---|---|
| [`infra/terraform/`](../../infra/terraform/) — Yandex Cloud VM provisioning | **Keep** | — | Untouched in this rebuild (per `AGENT.md` §4 / spec §15.5). Re-examined only if Phase 7 changes the runtime topology. |

### 5.5 Scripts

| Area | Verdict | Phase | Note |
|---|---|---|---|
| [`scripts/todo-integration-smoke.sh`](../../scripts/todo-integration-smoke.sh) | **Rewrite** | Phase 7.G | Currently bypasses real auth by inserting a session row directly ([`problems.md` §1.3](problems.md)). The Phase 7.G test plan decides whether to keep this script (driving it through the real Yandex ID flow is impossible in CI) or fold its checks into Go integration tests. |

---

## 6. Documentation

### 6.1 Documentation already deleted in Phase 1 (no further action)

Phase 1 task 1.5 (PR #97) deleted these. Listed here so the index of decisions is complete and a future agent can confirm the deletions match `repo-map.md` §7.

| Path | Verdict | Phase | Note |
|---|---|---|---|
| `ANALYSIS.md`, `PLAN.md`, `CHANGELOG.md` | **Remove (done)** | Phase 1.5 | Removed. |
| `docs/specs/`, `docs/design/`, `docs/modules/` | **Remove (done)** | Phase 1.5 | Removed. |
| `docs/architecture.md`, `docs/dev-setup.md`, `docs/roadmap.md`, `docs/migration.md`, `docs/production.md`, `docs/doc-inventory.md`, `docs/dependency-updates.md`, `docs/github-actions.md`, `docs/github-feature-ritual.md`, `docs/yandex-cost-estimate.md` | **Remove (done)** | Phase 1.5 | Removed. |

### 6.2 Documentation introduced or owned by this rebuild

| Area | Verdict | Phase | Note |
|---|---|---|---|
| [`README.md`](../../README.md) | **Keep (rewritten in Phase 1.4)** | Phase 1.4 | Already replaced. |
| [`AI.md`](../../AI.md) | **Keep (created in Phase 1.1)** | Phase 1.1 | The repo-root agent brief. |
| [`rebuild/AGENT.md`](../../rebuild/AGENT.md), [`rebuild/TASKS.md`](../../rebuild/TASKS.md), [`rebuild/todo_hub_ai_first_rebuild_spec.md`](../../rebuild/todo_hub_ai_first_rebuild_spec.md), [`rebuild/todo_hub_ai_first_rebuild_plan.md`](../../rebuild/todo_hub_ai_first_rebuild_plan.md) | **Keep** | — | Live source of truth. Edited in place as tasks land. |
| [`docs/adr/0001-focus-on-todo-only.md`](../adr/0001-focus-on-todo-only.md), [`docs/adr/0004-system-design-before-rebuild.md`](../adr/0004-system-design-before-rebuild.md) | **Keep** | — | Phase 1 ADRs. |
| [`docs/audit/repo-map.md`](repo-map.md), [`current-state.md`](current-state.md), [`problems.md`](problems.md) | **Keep** | — | Phase 0–2 audit trail. This file is part of the same set. |
| `docs/adr/0002-ai-first-repository-structure.md`, `0003-github-wiki-for-user-docs.md` | **Rewrite** | Phase 4 (4.1, 4.2) | Pending — not yet created. |
| `docs/system-design/*.md`, `docs/refactor/*.md`, `docs/prompts/*.md`, `docs/design/*.md`, `docs/production/*.md`, `docs/wiki/*.md`, `docs/learning-log/*.md` | **Rewrite** | Phases 3–10 | Created fresh per `rebuild/TASKS.md`. |
| `ARCHITECTURE.md`, `CONTRIBUTING.md` | **Rewrite** | Phase 4 (4.3, 4.4) | Pending — created in Phase 4. |

### 6.3 Other root markdown

| Area | Verdict | Phase | Note |
|---|---|---|---|
| `LICENSE`, `.gitignore`, `.dockerignore`, `.editorconfig` | **Keep** | — | Repository housekeeping (no audit concerns). |

---

## 7. Cross-cutting decisions

A handful of decisions live across files and are easier to record in one place.

| Decision | Verdict | Phase | Anchor |
|---|---|---|---|
| Authentication redesign | **Defer** | — | `AGENT.md` §2 forbids redesign. |
| Auth allow-list (`AUTH_ALLOWED_EMAILS`) | **Keep** | — | Production safety control. |
| Long session TTL (30 days) + manual-revocation only | **Defer** | — | [`problems.md` §3.5](problems.md). Recorded risk, not a planned fix. |
| Add `golangci-lint` to backend quality gates | **Defer** | Phase 7 polish | Spec §15.2 calls for it; not yet wired into `make lint` / CI. Recorded as a debt item — see [`technical-debt.md`](technical-debt.md) (pending). |
| Replace hand-rolled `OptionalT` PATCH pattern with a typed contract | **Defer to Phase 3** | Phase 3 (3.4) → Phase 7.D | Decision lives in `api-contract.md`. [`problems.md` §2.5](problems.md). |
| Machine-readable API contract (OpenAPI / typed RPC / contract tests) | **Defer to Phase 3** | Phase 3 (3.4) → Phase 7.D | Same — [`problems.md` §2.6](problems.md). |
| SPA + binary version drift mitigation (banner, `412 Precondition Failed`) | **Defer to Phase 3** | Phase 3 → Phase 7.E | [`problems.md` §3.6](problems.md). |
| `WEB_ORIGIN` CORS alignment startup-log line | **Defer to Phase 3** | Phase 3 (3.6) | [`problems.md` §3.9](problems.md). Cheap mitigation, low priority. |
| n8n integration / orchestrator workflows | **Remove** | Phase 7.A–B | Removed together with `internal/orchestrator/` and `apps/web/src/app/components/orchestrator/`. |
| Phase 7.0 navigation hide step before code deletion | **Keep as a gate** | Phase 7.0 | Mandatory pre-step so production stays usable while Phase 7.A–E land. |

---

## 8. What is intentionally **not** here

Per the Phase 2 split in [`docs/audit/current-state.md` §7](current-state.md) and [`problems.md` §4](problems.md):

- **Concrete technical-debt items with impact and proposed cleanup phase** → [`docs/audit/technical-debt.md`](technical-debt.md) (task 2.4, pending). The **Defer** entries above will reappear there as debt entries with explicit impact estimates and cleanup phases.
- **Phase 7 slicing of the Rewrite/Remove items** → output of [`docs/refactor/todo-architecture-refactor-plan.md`](../refactor/todo-architecture-refactor-plan.md) (task 6.1, pending). This file says **what** changes and **roughly when**; the refactor plan decides **how** the work is sliced.
- **Phase 3 design choices** (PATCH contract, OpenAPI vs typed RPC, route canonicalization, design tokens) → `docs/system-design/*.md` (tasks 3.1–3.6, pending). This file only flags those decisions as **Defer to Phase 3**.

If a decision here turns out to disagree with what later phases produce, **trust the later phase** and update this file in a follow-up PR — this snapshot is point-in-time, not a contract.
