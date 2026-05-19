# Technical Debt — Phase 2 Audit (concrete debt items, impact, cleanup phase)

> Read this together with [`rebuild/AGENT.md`](../../rebuild/AGENT.md), [`rebuild/TASKS.md`](../../rebuild/TASKS.md), the Phase 0 snapshot in [`docs/audit/repo-map.md`](repo-map.md), the descriptive companion [`docs/audit/current-state.md`](current-state.md), the diagnostic companion [`docs/audit/problems.md`](problems.md), and the decisional companion [`docs/audit/keep-remove-defer.md`](keep-remove-defer.md).
> Snapshot date: 2026-05-19.
> Scope split: this file is the **debt registry** — every item has an explicit impact estimate and a proposed cleanup phase. The "why" lives in `problems.md`; the verdict (Keep / Rewrite / Remove / Defer) lives in `keep-remove-defer.md`; the "when sliced into PRs" is the output of Phase 6 ([`docs/refactor/todo-architecture-refactor-plan.md`](../refactor/todo-architecture-refactor-plan.md), pending). This file does **not** repeat those — it indexes them and adds the missing impact + phase columns.

---

## 1. How to read this file

Each entry has five fields:

- **ID** — `TD-NN` stable identifier for cross-referencing from PRs, ADRs, and future audits.
- **Title** — one-line name of the debt.
- **Anchors** — links into `problems.md` / `keep-remove-defer.md` / `current-state.md` where the item is already documented.
- **Impact** — what the project pays for carrying this debt today. One of:
  - **Blocker** — work in the rebuild's active scope cannot land safely until this is fixed.
  - **High** — the debt actively misleads contributors (humans or AI), wastes signal, or holds non-trivial risk that can bite in production.
  - **Medium** — the debt slows work or hides minor risk; tolerable until the relevant phase touches the area.
  - **Low** — cosmetic / hygiene; worth recording so it does not get forgotten.
- **Cleanup phase** — the phase in [`rebuild/TASKS.md`](../../rebuild/TASKS.md) where the work lands. If the item is **out of rebuild scope**, the phase is `—` and the entry is in §6 (Out of scope, recorded for future work).
- **Notes** — anything that constrains the cleanup or that a future agent should not miss.

Bookkeeping rules:

- Items here are **debt**, not features. A missing capability that is not yet written is **not** debt; an existing implementation that costs more than it gives is.
- A debt item is closed by the PR that lands the cleanup. The closing PR removes the entry from this file (or marks it `**Resolved (PR #NN)**`), so the file stays a live registry, not an archive.
- If a new debt is discovered after this audit lands, add it as `TD-NN` (next free number) — do not renumber existing entries.

---

## 2. Backend / Go debt

| ID | Title | Anchors | Impact | Cleanup phase |
|---|---|---|---|---|
| **TD-01** | Oversized single-file Go layers in `internal/todo/` (handler 736 lines, repository 562, task entity 491, service 441) | [`problems.md` §2.4](problems.md), [`keep-remove-defer.md` §2.1](keep-remove-defer.md) | **High** — AI edits in these files have to load whole files into context; small changes risk distant collateral edits. Direct violation of spec [§3.2 "small files with narrow responsibility"](../../rebuild/todo_hub_ai_first_rebuild_spec.md). | Phase 6 plan → Phase 7.D |
| **TD-02** | Frozen-module Go mounts (`/finance`, `/orchestrator`, `/orchestrator/n8n` callback) still wired in [`router.go`](../../internal/platform/http/router.go) | [`problems.md` §3.1](problems.md), [`keep-remove-defer.md` §2.4](keep-remove-defer.md) | **High** — every router edit has to keep frozen mounts compiling, and the n8n callback is intentionally mounted **without** session middleware ([`router.go:112`](../../internal/platform/http/router.go:112)). A small middleware refactor can silently change auth posture there. | Phase 7.B |
| **TD-03** | Hand-rolled `OptionalT{ Set, Value }` PATCH pattern with no schema | [`problems.md` §2.5](problems.md), [`keep-remove-defer.md` §7](keep-remove-defer.md) | **Medium** — adding a Todo field requires four coordinated edits (DTO, allowed-fields check, service merge, SQL update) with no compile-time link between them. Decision deferred to Phase 3 [`api-contract.md`](../system-design/api-contract.md). | Phase 3 (3.4) → Phase 7.D |
| **TD-04** | No machine-readable API contract (no OpenAPI, no JSON Schema, no typed client) | [`problems.md` §2.6](problems.md), [`keep-remove-defer.md` §7](keep-remove-defer.md) | **High** — client/server drift is unflagged; renames on the Go side rely on a human to also edit [`apps/web/src/app/api/todoApi.ts`](../../apps/web/src/app/api/todoApi.ts). No contract test exists. | Phase 3 (3.4) → Phase 7.D |
| **TD-05** | `golangci-lint` not wired into `make lint` / CI even though spec [§15.2](../../rebuild/todo_hub_ai_first_rebuild_spec.md#152-backend) calls for it | [`keep-remove-defer.md` §7](keep-remove-defer.md) | **Medium** — backend lint stops at `gofmt` + `go vet`. Misses common issues (`errcheck`, `staticcheck`, `unused`, `gosimple`) that mainstream Go projects catch at PR time. | Phase 7 polish (sub-task added during Phase 6 planning) |
| **TD-06** | Path-vocabulary divergence: backend says `todo` (`internal/todo/`, `/api/v1/todo`), frontend says `tasks` (`apps/web/src/modules/tasks/`, `/tasks`) | [`problems.md` §2.3](problems.md), [`current-state.md` §2.5](current-state.md) | **Medium** — cross-stack `git grep` for the module yields two vocabularies; an AI agent referring to "the Todo module" has to know to search both. | Phase 6 plan → Phase 7.C–D (canonical name chosen during the `packages/domain` migration) |
| **TD-07** | `AUTH_DEV_BYPASS: ${AUTH_DEV_BYPASS:-true}` default in [`docker-compose.yml:40`](../../docker-compose.yml:40) — insecure-by-default | [`problems.md` §1.5](problems.md), [`keep-remove-defer.md` §2.2](keep-remove-defer.md), [`current-state.md` §3.3](current-state.md) | **Medium** — production is safe (deploy overrides to `false`), but any future deploy path that forgets the override inherits an unauthenticated API. Flipping the default needs a real local-session story to replace it. | Out of rebuild scope (see §6) — auth is `Defer` per `rebuild/AGENT.md` §2 |

### 2.1 Notes on backend debt

- **TD-01** must not be addressed by a "split the file" PR before Phase 6 produces a refactor plan. The seams (DTOs vs handlers, recurrence vs entity, Projects vs Tasks repositories) are exactly what Phase 6 task 6.1 has to call out, so a premature split would lock in the wrong shape.
- **TD-02** is on the critical path for production safety: the orchestrator callback mount **is the auth-bypass surface that exists today**. Phase 7.B must remove the mounts in lockstep with the package deletions; a half-removed state is worse than the current state.
- **TD-03** and **TD-04** are linked. The Phase 3 `api-contract.md` decision (OpenAPI generation, contract tests against the live binary, or a typed-RPC layer like tRPC/Connect) closes both. Choose once, not twice.

---

## 3. Frontend / web debt

| ID | Title | Anchors | Impact | Cleanup phase |
|---|---|---|---|---|
| **TD-08** | Frontend `test:run` and `test:e2e` in [`apps/web/package.json:13-14`](../../apps/web/package.json:13) are `echo` placeholders that exit 0 | [`problems.md` §1.1](problems.md), [`keep-remove-defer.md` §3.5](keep-remove-defer.md), [`current-state.md` §5.1](current-state.md) | **Blocker for Phase 7.E** — the Todo UI redesign cannot land safely without a frontend test floor. CI also reports "tests passed" on every PR today, which is actively misleading. | Phase 7.G (must land **before or alongside** Phase 7.E, not after — see [`problems.md` §3.8](problems.md)) |
| **TD-09** | CI installs Playwright every run but `test:e2e` is the `echo` placeholder — wasted build minutes, misleading "Playwright in CI" signal | [`problems.md` §1.2](problems.md), [`keep-remove-defer.md` §3.5 / §5.2](keep-remove-defer.md) | **Medium** — wasted CI minutes; a fresh contributor reading [`ci.yml`](../../.github/workflows/ci.yml) assumes browser-driven tests run. | Phase 7.G (closed by the same PR that lands real e2e tests; do **not** remove the install before tests exist) |
| **TD-10** | No ESLint, Prettier, Stylelint, or a11y lint configured for `apps/web/`; `make lint` stops at `tsc --noEmit` | [`problems.md` §1.6](problems.md), [`keep-remove-defer.md` §3.5](keep-remove-defer.md), [`current-state.md` §5.1](current-state.md) | **High** — no rule-based catch for accidental `any`, dead imports, hook-rule violations, JSX-key mistakes, or a11y regressions across the React tree. Phase 7.E redesign lands into a tree with no stylistic guardrail. | Phase 7.G — minimum: ESLint with `react-hooks` and `jsx-a11y` rule sets |
| **TD-11** | Module-registry / route-table fanout: hide/remove a navigable module requires synchronized edits across 4 places | [`problems.md` §2.2 + §3.7](problems.md), [`keep-remove-defer.md` §3.1–§3.2](keep-remove-defer.md) | **High** — Phase 7.0 (the first dress rehearsal for module removal) ships a broken-route surface if any of the four places is missed. The four are: [`shared/config/modules.ts`](../../apps/web/src/shared/config/modules.ts), [`app/routes.tsx`](../../apps/web/src/app/routes.tsx), [`internal/platform/http/router.go`](../../internal/platform/http/router.go), and `migrations/`. | Phase 7.0 (mitigation: a Phase 6 checklist enumerating "every place that mentions module X") |
| **TD-12** | Duplicate `/tasks` and `/todo` routes both rendering `TasksPage` with no documented canonical | [`problems.md` §2.9](problems.md), [`keep-remove-defer.md` §3.3](keep-remove-defer.md), [`current-state.md` §2.5](current-state.md) | **Low** — both work; the cost is documentation confusion and a future "simplification" PR risking a production-user bookmark. Backend post-login redirect targets `/todo`. | Phase 5 design / Phase 6 plan (pick one canonical, the other becomes a documented alias) |
| **TD-13** | No design-token document; styling spread across `index.css`, `tailwind.css`, `theme.css`, `class-variance-authority` variants, and Radix primitives, with no inventory | [`problems.md` §2.7](problems.md), [`keep-remove-defer.md` §3.4](keep-remove-defer.md) | **Blocker for Phase 7.E** — "make this consistent with the existing UI" is unanswerable for an AI agent today; the redesign cannot proceed without a documented token set. | Phase 5 (`docs/prompts/claude-design-brief.md`, `docs/design/design-review-template.md`) → Phase 7.E |
| **TD-14** | SPA-and-binary version drift mitigation missing (no version handshake, no banner-on-update) | [`problems.md` §3.6](problems.md), [`keep-remove-defer.md` §7](keep-remove-defer.md) | **Medium** — a stale browser tab after a deploy calls a renamed endpoint and surfaces as an unexplained 404 / decode error. Mitigation (version header, `412 Precondition Failed`, soft-reload banner) is cheap and lives naturally in the Phase 3 API contract. | Phase 3 (3.4) → Phase 7.E |

### 3.1 Notes on frontend debt

- **TD-08 / TD-09 / TD-10** are the same project — a Phase 7.G "frontend quality floor" PR sequence. They are listed separately because each has a distinct failure mode (silent regressions vs wasted CI minutes vs no style guardrail) and a Phase 6 slicing decision may land them in separate PRs.
- **TD-11** is the most likely place for the Phase 7.0 "hide non-Todo nav" task to ship a partial state. The mitigation is a written checklist in the Phase 6 refactor plan, not better discipline — discipline is unreliable, the checklist is reviewable.
- **TD-12** depends on a Phase 5 design decision, not a debt cleanup. Listed here so the choice does not get lost between phases.

---

## 4. Database, migrations, and persistence debt

| ID | Title | Anchors | Impact | Cleanup phase |
|---|---|---|---|---|
| **TD-15** | Frozen-module migrations (`000005`–`000007` finance, `000011` orchestrator) will outlive their Go code after Phase 7.B | [`problems.md` §3.2](problems.md), [`keep-remove-defer.md` §4](keep-remove-defer.md) | **Medium** — orphan tables drift in schema as Postgres versions move, and a future contributor may assume the tables are still alive. Spec [§15.5](../../rebuild/todo_hub_ai_first_rebuild_spec.md#155-production-safety) preserves the migration files; the keep-tables-vs-drop choice is deferred to a Phase 7 ADR. | Phase 7 ADR (referenced from refactor task 7.B); marker comment added to `migrations/README.md` (file does not exist today) |
| **TD-16** | No rehearsed PostgreSQL restore drill; backup script runs `pg_dump` to Object Storage but restore is unverified | [`problems.md` §3.3](problems.md), [`keep-remove-defer.md` §4](keep-remove-defer.md), [`current-state.md` §4.3](current-state.md) | **High** — production data loss is recoverable in theory only. The window is **unbounded** until the restore step is rehearsed end-to-end and timed. | Phase 8.4 (`docs/production/backup-restore.md` is the deliverable name in `rebuild/TASKS.md`) |
| **TD-17** | `migrate up` runs on every deploy with no rehearsed rollback path, especially for the destructive `000010_todo_hierarchy_archive_recurrence` down-migration | [`problems.md` §3.4](problems.md), [`keep-remove-defer.md` §4](keep-remove-defer.md) | **High** — a broken migration locks the deploy. Rolling back requires either reverting the SQL by hand or trusting an unrehearsed `migrate down` against production-shape data. | Phase 6 plan (per-slice rollback expectation) → Phase 8 (rehearsal recorded in the readiness checklist) |

### 4.1 Notes on persistence debt

- **TD-15** is a documentation-and-decision item — no schema change is required to close it. The smallest fix is an ADR + a `migrations/README.md`. Phase 7.B is the right moment because that is when the corresponding Go code disappears and the tables would otherwise become silently orphaned.
- **TD-16 / TD-17** are paired: a rehearsed restore drill (**TD-16**) is the precondition for any honest rollback rehearsal of a destructive migration (**TD-17**). Sequence them in that order during Phase 8.

---

## 5. CI, build, and operational debt

| ID | Title | Anchors | Impact | Cleanup phase |
|---|---|---|---|---|
| **TD-18** | Todo integration smoke ([`scripts/todo-integration-smoke.sh`](../../scripts/todo-integration-smoke.sh)) bypasses real auth by inserting an `auth_sessions` row directly | [`problems.md` §1.3](problems.md), [`keep-remove-defer.md` §5.5](keep-remove-defer.md), [`current-state.md` §5.1](current-state.md) | **High** — the only end-to-end check that runs today is silent about every auth regression. Any schema change in `auth_sessions` can break the smoke without a test failure, and vice versa. | Phase 7.G — decide between (a) keeping the script and rewriting it against the real Yandex ID flow (impossible in CI), or (b) folding its checks into Go integration tests against a stubbed auth provider |
| **TD-19** | Dashboard at [`apps/web/src/app/components/Dashboard.tsx`](../../apps/web/src/app/components/Dashboard.tsx) surfaces six tiles for frozen modules; production users see a UI that contradicts the rebuild's stated scope | [`problems.md` §1.4](problems.md), [`keep-remove-defer.md` §3.1–§3.2](keep-remove-defer.md) | **High** — production-visible. The rebuild claims "Todo only" while the live UI shows Finance, Investments, FIRE, Calendar, Orchestrator. | Phase 7.0 — the first task that touches production-visible code; gates the Phase 7.A–E sequence |
| **TD-20** | `WEB_ORIGIN` CORS gate has no alignment startup-log line; a misconfigured value surfaces only as failed browser requests rejected at the middleware layer | [`problems.md` §3.9](problems.md), [`keep-remove-defer.md` §7](keep-remove-defer.md) | **Low** — cheap mitigation, rare failure. A one-line `slog.Info("cors origin", "origin", cfg.WebOrigin)` at startup closes most of the symptom-to-cause gap. | Phase 3 (3.6 deployment-model section flags it) → Phase 7.C (one-line addition during the `apps/api/ → server/` move) |

### 5.1 Notes on operational debt

- **TD-18** is the closest thing the project has to an integration test. Removing it before Phase 7.G has a replacement would lower the floor; rewriting it before the test-floor decision is made would waste work. Wait for Phase 7.G.
- **TD-19** is a `Remove` verdict in [`keep-remove-defer.md` §3.1–§3.2](keep-remove-defer.md), not a `Rewrite`. The Phase 7.0 task replaces the six-tile grid with the Todo entry only; the redesigned navigation in Phase 7.E replaces it again. Two coordinated changes, not one.

---

## 6. Out of rebuild scope (recorded for future work)

These items are real debt but are explicitly **deferred** by `rebuild/AGENT.md` §2 and spec [§15.1–§15.6](../../rebuild/todo_hub_ai_first_rebuild_spec.md#15-project-specific-decisions-anton415-hub). They are listed here so the registry is complete; no PR in this rebuild will close them.

| ID | Title | Anchors | Why deferred | Suggested future home |
|---|---|---|---|---|
| **TD-21** | Long session TTL (`AUTH_SESSION_TTL=720h`, 30 days) with manual-revocation only — no rotation, no force-logout-all admin tool | [`problems.md` §3.5](problems.md), [`keep-remove-defer.md` §7](keep-remove-defer.md) | Auth redesign is forbidden by `AGENT.md` §2. Stolen-cookie blast radius is acknowledged. | A separate "Auth hardening" project after the Todo rebuild ships. |
| **TD-22** | Wired-but-unused GitHub and VK ID OAuth provider blocks in [`router.go:151-185`](../../internal/platform/http/router.go:151) and corresponding `.env.example` / `docker-compose.yml` knobs | [`problems.md` §2.8](problems.md), [`keep-remove-defer.md` §2.2](keep-remove-defer.md) | Removal touches the auth surface, which is **Defer** per `AGENT.md` §2. | Same future "Auth hardening" project — paired with TD-21. |
| **TD-23** | Magic-link email login (`/auth/email/*`) functional when SMTP is configured but unused in production | [`current-state.md` §3.1](current-state.md), [`keep-remove-defer.md` §2.2](keep-remove-defer.md) | Same — auth not redesigned in this rebuild. | Same future "Auth hardening" project — decide keep vs remove together with TD-22. |
| **TD-24** | TD-07 (`AUTH_DEV_BYPASS` insecure default) — listed in §2 with cleanup phase `—` because the fix is gated by a real local-session story that lives outside this rebuild | [`problems.md` §1.5](problems.md), [`keep-remove-defer.md` §2.2](keep-remove-defer.md) | Same auth-redesign boundary. Production is safe today (deploy override). | Same future "Auth hardening" project — closes with TD-21/22/23. |

The deferred items are also tracked by their `TD-NN` IDs so a future "Auth hardening" project can pick them up as a batch without re-discovering them.

---

## 7. Cross-reference summary

For agents picking up Phase 6/7 work, the debt items load roughly along these axes:

| Phase | Items it closes |
|---|---|
| Phase 3 (System Design) — task 3.4 | TD-03, TD-04, TD-14 (decisions only; implementation lands in Phase 7) |
| Phase 3 — task 3.6 | TD-20 (flagged in deployment-model.md; one-line code lands later) |
| Phase 5 (Claude Design Prep) | TD-12 (canonical route choice), TD-13 (design tokens) |
| Phase 6 (Refactor Plan) — task 6.1 | TD-01 (seams identified), TD-11 (the "every place that mentions module X" checklist), TD-17 (per-slice rollback expectations) |
| Phase 7.0 | TD-11, TD-19 |
| Phase 7.A–B | TD-02, TD-15 (ADR), TD-22/23/24 are **not** closed here |
| Phase 7.C | TD-06 (canonical name), TD-20 (one-line addition) |
| Phase 7.D | TD-01 (file splits land), TD-03, TD-04 (API contract realized) |
| Phase 7.E | TD-13, TD-14 |
| Phase 7.G | TD-08, TD-09, TD-10, TD-18 |
| Phase 7 polish (sub-task added during Phase 6) | TD-05 |
| Phase 8.4 | TD-16, TD-17 (rehearsal recorded) |
| Out of rebuild scope | TD-07, TD-21, TD-22, TD-23, TD-24 |

If a debt item is closed without removing it from this file, the registry has lied. The closing PR's checklist must include "remove or mark Resolved in `docs/audit/technical-debt.md`".

---

## 8. What is intentionally **not** here

- **The "why" behind each item** → [`docs/audit/problems.md`](problems.md). This file links to the right section but does not re-explain the failure mode.
- **The Keep/Rewrite/Remove/Defer verdict per area** → [`docs/audit/keep-remove-defer.md`](keep-remove-defer.md). This file uses those verdicts but does not re-derive them.
- **PR-sized slicing of the cleanup work** → output of [`docs/refactor/todo-architecture-refactor-plan.md`](../refactor/todo-architecture-refactor-plan.md) (task 6.1, pending). This file says **what** the debt costs and **which phase** owns the cleanup; the refactor plan decides **how** each phase is sliced into PRs.
- **New features or missing capabilities** → tracked through the Phase 3 system-design documents and the Phase 7 implementation tasks. A missing feature is not debt; this registry only lists implementations that cost more than they give.

If a debt item here turns out to disagree with the code (e.g., a line count has moved, a route has already been removed), **trust the code** and update this file in a follow-up PR — this snapshot is point-in-time, not a contract.
