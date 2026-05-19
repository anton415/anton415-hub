# Problems — Phase 2 Audit (failures, AI-readability blockers, risks)

> Read this together with [`rebuild/AGENT.md`](../../rebuild/AGENT.md), [`rebuild/TASKS.md`](../../rebuild/TASKS.md), the Phase 0 snapshot in [`docs/audit/repo-map.md`](repo-map.md), and the descriptive companion [`docs/audit/current-state.md`](current-state.md).
> Snapshot date: 2026-05-19.
> Scope split: this file is **diagnostic** — what is broken, what makes AI-assisted work harder, and what may bite later. Keep/remove/defer decisions live in `keep-remove-defer.md` (task 2.3); concrete debt items with cleanup phases live in `technical-debt.md` (task 2.4). Items here can be referenced from both.

---

## 1. Failures — things that do not work as the surface suggests

### 1.1 Frontend tests are placeholders that exit 0

[`apps/web/package.json:13-14`](../../apps/web/package.json:13) defines:

```jsonc
"test:run": "echo 'No unit tests yet — to be rewritten against the React tree'",
"test:e2e": "echo 'No e2e tests yet — to be rewritten against the React tree'"
```

Both commands print and exit `0`. They are invoked by `make test`, `make test-e2e`, and by the frontend job in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml). CI reports "tests passed" for every PR even though no frontend behavior is verified.

**Impact:** silent regressions across the entire Todo UI are possible at any time. An AI agent reading CI output cannot trust the frontend-test signal. Phase 7.G has to build a test harness from zero.

### 1.2 CI installs Playwright every run but never drives a browser

[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) runs `npx playwright install --with-deps chromium` and then `npm run test:e2e`, which is the echo above. The browser install completes, the echo runs, the job passes. Build minutes are spent provisioning a tool that exercises nothing.

**Impact:** wasted CI time and a misleading "Playwright runs in CI" badge. Either remove the install or write a real e2e test (Phase 7.G).

### 1.3 The Todo integration smoke bypasses the real auth path

[`scripts/todo-integration-smoke.sh:36-38`](../../scripts/todo-integration-smoke.sh:36) inserts a session row directly into `auth_sessions` with a fixed token (`local-smoke-session`) and uses that cookie to call the API:

```sh
INSERT INTO auth_sessions (token_hash, email, provider, created_at, expires_at, last_seen_at)
```

It never exercises Yandex ID, the OAuth callback, the email magic-link flow, the IP rate limiter, or the allow-list check. It validates Todo HTTP wiring against a known-authenticated principal only.

**Impact:** the only end-to-end check that runs today is silent about every auth regression. Any schema change in `auth_sessions` can break the smoke without a test failure, and vice versa.

### 1.4 Dashboard still surfaces every frozen module

[`apps/web/src/shared/config/modules.ts`](../../apps/web/src/shared/config/modules.ts) registers six modules — `tasks`, `finances`, `investments`, `fire`, `calendar`, `orchestrator` — all of which render on `/` via `Dashboard.tsx`. `investments`, `fire`, `calendar` are marked `"coming-soon"`; `finances` and `orchestrator` are marked `"active"`. Production users see a six-tile grid with frozen modules looking live.

[`apps/web/src/app/routes.tsx`](../../apps/web/src/app/routes.tsx) mounts working routes for `/finances`, `/orchestrator`, `/orchestrator/projects`, `/orchestrator/workflows/:workflowId`, and placeholder routes for `/investments`, `/fire`, `/calendar` — see `repo-map.md` §5.

**Impact:** the rebuild's stated scope ("Todo only") is not reflected in what the user sees. Phase 7.0 (hide non-Todo navigation) gates the Todo redesign so that the UI stops claiming things the rebuild has frozen.

### 1.5 `AUTH_DEV_BYPASS` defaults to `true` in `docker-compose.yml`

[`docker-compose.yml:40`](../../docker-compose.yml:40):

```yaml
AUTH_DEV_BYPASS: ${AUTH_DEV_BYPASS:-true}
```

The dev-bypass middleware injects a fake `dev@localhost` principal that satisfies every `RequireAuthenticated` check. The default is dangerous: anyone running the compose stack as-is exposes an unauthenticated API on whatever interface the host binds.

The production deploy script explicitly sets `AUTH_DEV_BYPASS=false` in [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml), so production is safe. But the default is the wrong direction (insecure-by-default), and any future deploy path that forgets to override it inherits the vulnerability.

**Impact:** safe today, fragile by default. Worth flipping to `false` once the dev-loop is wired to provide a real local session.

### 1.6 Frontend lint is `tsc --noEmit` only

There is no ESLint, no Prettier, no Stylelint configured for `apps/web/`. `make lint` runs `gofmt -l` plus `go vet` for Go and `tsc --noEmit` for TypeScript ([`Makefile`](../../Makefile)). `npm run check` is the only frontend gate.

**Impact:** stylistic drift across the React tree, no rule-based catch of accidental `any`, dead imports, unused vars, hook-rule violations, JSX-key mistakes, or accessibility lints. Phase 7 will need to introduce ESLint with rules for `react-hooks` and `jsx-a11y` at minimum.

---

## 2. AI-readability blockers — what makes Claude/Codex slower or wrong here

Reference criteria: spec [§3.2 "AI-First Codebase"](../../rebuild/todo_hub_ai_first_rebuild_spec.md). The items below are concrete violations of those criteria in the codebase today.

### 2.1 No high-level architecture document at repository root

There is no `ARCHITECTURE.md`, no `docs/system-design/`, no domain-model document, no `CONTRIBUTING.md`. A cold AI session has to derive the layout from filesystem walks and code reads. `rebuild/AGENT.md` and `AI.md` describe the rebuild rules but not the system. The Phase 3 and Phase 4 docs (`docs/system-design/`, `ARCHITECTURE.md`, `CONTRIBUTING.md`) are still pending.

**Impact:** every new agent re-derives the same information about how the binary, the SPA, the database, and Caddy fit together. Phase 3 and Phase 4 close this.

### 2.2 Module-registry / routes / router fanout

To add or remove a navigable module the agent must edit at least four places:

1. [`apps/web/src/shared/config/modules.ts`](../../apps/web/src/shared/config/modules.ts) — dashboard tile.
2. [`apps/web/src/app/routes.tsx`](../../apps/web/src/app/routes.tsx) — route registration.
3. [`internal/platform/http/router.go`](../../internal/platform/http/router.go) — backend mount under `/api/v1/`.
4. [`migrations/`](../../migrations/) — schema.

No single source of truth ties them. Routes file mixes imported pages with inline `<div>` placeholders (`/investments`, `/fire`). Module IDs in the registry (`tasks`) do not match the path (`/tasks`) or the backend mount (`/api/v1/todo`). An AI agent enumerating "all places that know about module X" cannot do it from one file.

**Impact:** rename/removal is error-prone. The Phase 7.0 step (hide non-Todo nav) has to touch every place coherently — easy to miss one and ship a broken-route surface.

### 2.3 Path vocabulary diverges across stacks

The Go side calls the module `todo` (`internal/todo/`, `/api/v1/todo`). The frontend side calls it `tasks` (`apps/web/src/modules/tasks/`, `/tasks`). The backend post-login redirect is `/todo`; the frontend mounts both `/tasks` and `/todo` at the same page to paper over the mismatch ([`routes.tsx:26-33`](../../apps/web/src/app/routes.tsx:26)).

**Impact:** cross-stack `git grep` for a module yields two vocabularies. An AI tool referring to "the Todo module" has to know to search both. The target monorepo layout (`packages/domain` for tasks/projects, `apps/web` for UI) is the place to pick one canonical name in Phase 6/7.

### 2.4 Large single-file Go layers

| File | Lines |
|---|---:|
| [`internal/todo/adapters/http/handler.go`](../../internal/todo/adapters/http/handler.go) | 736 |
| [`internal/todo/adapters/postgres/repository.go`](../../internal/todo/adapters/postgres/repository.go) | 562 |
| [`internal/todo/domain/task.go`](../../internal/todo/domain/task.go) | 491 |
| [`internal/todo/application/service.go`](../../internal/todo/application/service.go) | 441 |

Each file mixes multiple concerns: `handler.go` carries DTOs, validation, request decoding, error mapping, and 10 endpoints; `repository.go` carries the full SQL surface for both `Projects` and `Tasks` aggregates; `task.go` holds the entity plus the recurrence engine plus URL normalization.

Spec §3.2: "small files with narrow responsibility". Today's files violate that guideline.

**Impact:** AI edits in these files are higher-risk — context windows have to load whole files, and small changes risk distant collateral edits. Phase 6 refactor plan must break these along clear seams (DTOs separate from handlers, recurrence separate from the entity, etc.).

### 2.5 Custom `OptionalT{ Set, Value }` pattern for PATCH

`PATCH /tasks/{id}` ([`internal/todo/adapters/http/handler.go`](../../internal/todo/adapters/http/handler.go) + [`internal/todo/application/service.go`](../../internal/todo/application/service.go)) uses a project-specific `OptionalT{ Set, Value }` shape to distinguish "field omitted" from "field explicitly set to null". No JSON-merge-patch library is used; the convention is enforced by hand-rolled code.

**Impact:** an AI agent adding a new field has to remember to add the `OptionalT` wrapper, the allowed-fields check, the service-level merge logic, and the postgres update SQL. There is no schema (OpenAPI, JSON Schema, zod) that mechanically generates or validates the shape. Phase 3 (api-contract.md) and Phase 6 should decide whether to keep the pattern or move to a generated contract.

### 2.6 No machine-readable API contract

There is no OpenAPI spec, no JSON Schema, no generated TypeScript client. The frontend's [`apps/web/src/app/api/todoApi.ts`](../../apps/web/src/app/api/todoApi.ts) is a hand-written `fetch` wrapper that must be kept in sync with the Go handler manually.

**Impact:** drift between client and server is unflagged. An AI agent renaming a server field must remember to update both the TypeScript types and the request/response shapes; no contract test catches a miss. Phase 3 (api-contract.md) should commit to one of: OpenAPI generation, contract tests against the live binary, or a typed-RPC layer.

### 2.7 Tailwind v4 + Radix + a custom `theme.css` with no documented tokens

`apps/web/src/styles/` carries `index.css`, `tailwind.css`, `theme.css`. Component variants use `class-variance-authority`. There is no design-token document, no color palette document, no spacing system documented, no component inventory.

**Impact:** "make this consistent with the existing UI" is an unanswerable instruction for an AI agent today — the answer lives implicitly in components. Phase 5 (Claude Design Brief, design review template) is where this gets pinned down.

### 2.8 Wired-but-unused surface: GitHub + VK OAuth providers

[`internal/platform/http/router.go`](../../internal/platform/http/router.go) pre-wires Yandex, GitHub, and VK providers, even though production only uses Yandex. Configuration flags (`AUTH_GITHUB_*`, `AUTH_VK_*`) exist in `.env.example` and `docker-compose.yml`.

**Impact:** dead surface bloats the auth code path that an AI agent has to read to answer "how does login work here". Per `rebuild/AGENT.md` §2, auth is **not** redesigned in this rebuild, so this stays — but a cleanup item belongs in `technical-debt.md` (task 2.4).

### 2.9 Duplicated `/tasks` and `/todo` routes with no documented canonical

[`apps/web/src/app/routes.tsx:26-33`](../../apps/web/src/app/routes.tsx:26) registers both `/tasks` and `/todo`, both rendering `TasksPage`. The backend's post-login redirect targets `/todo`. There is no doc declaring `/todo` as canonical and `/tasks` as a back-compat alias (or vice versa).

**Impact:** an AI agent simplifying routes might delete the "duplicate" and break a production-user bookmark. Phase 5/6 design must pick one canonical and document the alias.

---

## 3. Technical risks — failure modes that may bite later

### 3.1 Frozen-module Go code is wired into the production router

[`internal/platform/http/router.go`](../../internal/platform/http/router.go) mounts `/finance`, `/orchestrator`, and `/orchestrator/n8n` alongside `/todo`. The orchestrator callback router is intentionally mounted **without** session middleware ([`router.go:112`](../../internal/platform/http/router.go:112)) and relies on a callback token instead. Until Phase 7 these mounts stay live.

**Risk:** any edit to `router.go` for a Todo-related reason has to keep the frozen mounts compiling. A small refactor (e.g., extracting middleware) can silently change auth posture on the n8n callback. Phase 6 must call this out as a per-PR review focus and Phase 7.B must remove the mounts in lockstep with the module deletions.

### 3.2 Frozen-module migrations will outlive their Go code

`migrations/000005..000007` (finance) and `migrations/000011` (orchestrator) will persist after Phase 7 deletes the corresponding Go packages. Spec §15.5 and `rebuild/AGENT.md` §2 say migrations are preserved; the choice between "keep tables idle" vs "DROP after backup" is deferred to a Phase 7 ADR.

**Risk:** orphan tables drift in schema as Postgres versions move, or the deferred decision is forgotten and the next person assumes the tables are alive. A Phase 7 ADR + a marker comment in `migrations/README.md` (which does not exist yet) is the smallest fix.

### 3.3 Single Postgres instance with no rehearsed restore drill

[`deploy/backup/pg_dump_to_object_storage.sh`](../../deploy/backup/pg_dump_to_object_storage.sh) runs `pg_dump` to Yandex Object Storage. There is no documented restore drill — Phase 8.4 in `rebuild/TASKS.md` is exactly this gap. The current backup is unverifiable until then.

**Risk:** a corruption or accidental destructive migration is recoverable in theory only. Loss of production Todo data is unbounded until the restore step is rehearsed.

### 3.4 Migrations run on every deploy with no rollback rehearsal

[`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml) runs `migrate up` on the production database as part of every release. `migrate down` is available but not rehearsed. Down-migrations for the destructive recurrence/hierarchy migration (`000010_todo_hierarchy_archive_recurrence`) have not been tested against production-shape data.

**Risk:** a broken migration locks the deploy. Rolling back requires either reverting the SQL by hand or trusting the unrehearsed `migrate down`. Phase 6 refactor plan must document a per-slice rollback expectation; Phase 8 readiness should record the rehearsal.

### 3.5 Long session TTL with manual revocation

Default `AUTH_SESSION_TTL` is `720h` (30 days) in [`docker-compose.yml:37`](../../docker-compose.yml:37). The single user model means cookie loss is a tractable but high-blast-radius event. Revocation is supported (`auth_sessions.revoked_at`) but only via the explicit logout endpoint — there is no rotation, no force-logout-all-sessions admin tool.

**Risk:** stolen cookie ⇒ 30-day window. Mitigation today is "trust the user's device hygiene". Auth is **out of scope** for this rebuild per `rebuild/AGENT.md` §2, so this is a registered risk, not a planned fix.

### 3.6 SPA and binary version drift in deploys

The Go binary serves the Vite-built SPA from `STATIC_DIR` in production. The two are baked into the same image, so a single image push is consistent — but there is no startup check that asserts "the API I expose matches the contract this bundle assumes". A cached browser tab can hold a stale bundle and call a renamed endpoint.

**Risk:** stale-tab errors after deploys. The mitigation in Phase 3 (api-contract.md) is to version the contract and emit a `412 Precondition Failed` on mismatch, plus a banner-on-update in the SPA. Today there is nothing.

### 3.7 Manual route fanout for module hide/remove

As called out in §2.2, removing a navigable module requires synchronized edits across the dashboard registry, the React Router routes, the Go router, and (eventually) migrations. Phase 7.0 (hide non-Todo nav) is the first dress rehearsal; missing one place leaves a half-hidden module.

**Risk:** Phase 7.0 ships a UI with a stale tile or a stale route. A Phase 6 checklist of "every place that mentions module X" mitigates this.

### 3.8 No frontend test floor for the Phase 7 redesign

The Todo UI redesign (Phase 7.E) lands in a tree with zero frontend tests. Behaviors like recurrence advancement, due-time validation, project-cycle prevention, and view filtering are only verified server-side. A redesign that subtly changes client-side behavior (e.g., how `lib/buildTree.ts` orders subtasks) ships without a guardrail.

**Risk:** silent UX regressions during the redesign. Phase 7.G needs to land **before or alongside** 7.E, not after, for the critical Todo behaviors enumerated in spec §4.2.

### 3.9 `WEB_ORIGIN` CORS gate has no alignment test

The CORS middleware keyed off `WEB_ORIGIN` ([`internal/platform/http/router.go`](../../internal/platform/http/router.go)) silently rejects mismatched origins. A misconfigured `WEB_ORIGIN` in `app.env` would surface only as failed browser requests, with the API returning the rejection at the middleware layer.

**Risk:** post-deploy "the app is white" symptoms with the real cause buried in CORS logs. A startup log line that emits the resolved `WEB_ORIGIN` would be a cheap mitigation; a Phase 3 deployment-model section should mention the alignment.

---

## 4. What is intentionally **not** here

Per the Phase 2 split documented in [`docs/audit/current-state.md` §7](current-state.md):

- **Keep / remove / defer decisions per area** → [`docs/audit/keep-remove-defer.md`](keep-remove-defer.md) (task 2.3, pending).
- **Concrete technical-debt items with impact and proposed cleanup phase** → [`docs/audit/technical-debt.md`](technical-debt.md) (task 2.4, pending). Many items above (e.g., 2.4 large files, 2.8 dead OAuth providers, 1.6 no ESLint) will reappear there as debt entries with an explicit cleanup phase.
- **Phase 7 refactor sequencing** → output of [`docs/refactor/todo-architecture-refactor-plan.md`](../refactor/todo-architecture-refactor-plan.md) (task 6.1, pending).
- **Auth redesign** → forbidden by `rebuild/AGENT.md` §2. Items 1.5, 2.8, 3.5 are recorded only.
- **Production data-path verification (backup/restore drill)** → planned for Phase 8.4. Item 3.3 is a pointer to that pending work.

If an observation here turns out to disagree with the code, **trust the code** and update this file in a follow-up PR.
