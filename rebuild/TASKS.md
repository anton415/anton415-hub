# Rebuild Task Tracker

> One task = one PR. Find the **first** `- [ ]` task, execute it, tick the box, append the PR URL, stop.
> Cold-start workflow lives in [`rebuild/AGENT.md`](AGENT.md).

**Legend**
- `- [ ]` not done
- `- [x]` done (PR opened — solo developer, so we tick the box when the PR for the task lands on the branch, not at merge)

---

## Phase 0 — Preparation

Plan ref: [§3](todo_hub_ai_first_rebuild_plan.md#3-phase-0-preparation)

- [x] **0.1** Commit rebuild source-of-truth files to the repository
      Output: `rebuild/AGENT.md`, `rebuild/TASKS.md`, `rebuild/todo_hub_ai_first_rebuild_spec.md`, `rebuild/todo_hub_ai_first_rebuild_plan.md`
      PR title: `docs: add Todo-only AI-first rebuild source documents`
      Acceptance: `rebuild/` is checked in on `main`; `AGENT.md` is the documented entry point.
      Quality gates: N/A (docs-only).
      PR: https://github.com/anton415/anton415-hub/pull/91

- [x] **0.2** Create `docs/audit/repo-map.md`
      Output: `docs/audit/repo-map.md`
      Inspect (do not modify): directory tree at depth 3, scripts (`Makefile`, `package.json`, Go entry points in `cmd/` or `apps/api/`), Todo-related files, non-Todo module files, current docs inventory (every file under `docs/` and root `*.md`), initial risk notes.
      PR title: `docs: add Phase 0 repository map (rebuild)`
      Acceptance: a fresh agent can read `repo-map.md` and locate the current Todo implementation without further exploration.
      Quality gates: N/A.
      PR: https://github.com/anton415/anton415-hub/pull/92

---

## Phase 1 — Scope Freeze (documentation-only, no code deletions)

Plan ref: [§4](todo_hub_ai_first_rebuild_plan.md#4-phase-1-scope-freeze)

- [x] **1.1** Create `AI.md` at repository root
      Content per spec §6.1: project goal, current priority (Todo only), frozen modules list, architecture rules, coding rules, testing rules, documentation rules, forbidden actions, quality gates.
      PR title: `docs: add AI.md working rules for AI agents`
      Acceptance: a fresh agent reading only `AI.md` understands Todo-only scope and forbidden actions.
      PR: https://github.com/anton415/anton415-hub/pull/93

- [x] **1.2** Create ADR `docs/adr/0001-focus-on-todo-only.md`
      Content: Status (Accepted), Context, Decision (Todo only; Finance/Calendar/Orchestrator/Investments/FIRE frozen and to be removed in Phase 7), Consequences, Alternatives.
      PR title: `docs(adr): add 0001 — focus on Todo only`
      PR: https://github.com/anton415/anton415-hub/pull/94

- [x] **1.3** Create ADR `docs/adr/0004-system-design-before-rebuild.md`
      Content per spec §6.3: explain why System Design (Phase 3) gates major implementation work.
      PR title: `docs(adr): add 0004 — system design before rebuild`
      PR: https://github.com/anton415/anton415-hub/pull/95

- [x] **1.4** Rewrite `README.md` for the rebuild direction
      Replace current production status / marketing content with: rebuild summary, current phase (linked to TASKS.md), pointer to `rebuild/AGENT.md`, pointer to spec and plan, minimal "how to run locally" section.
      PR title: `docs: rewrite README for Todo-only AI-first rebuild`
      PR: https://github.com/anton415/anton415-hub/pull/96

- [x] **1.5** Delete superseded documentation
      Delete: `ANALYSIS.md`, `PLAN.md`, `CHANGELOG.md`, `docs/specs/`, `docs/design/`, `docs/modules/`, `docs/architecture.md`, `docs/dev-setup.md`, `docs/roadmap.md`, `docs/migration.md`, `docs/production.md`, `docs/doc-inventory.md`, `docs/dependency-updates.md`, `docs/github-actions.md`, `docs/github-feature-ritual.md`, `docs/yandex-cost-estimate.md`.
      Verify each removal against `docs/audit/repo-map.md` (created in task 0.2) before deleting — anything not in the snapshot must be flagged, not deleted silently.
      PR title: `chore: remove superseded documentation (rebuild Phase 1)`
      Acceptance: under `docs/` only `audit/` and `adr/` remain (plus any folder created so far in this rebuild).
      PR: https://github.com/anton415/anton415-hub/pull/97

---

## Phase 2 — Current State Audit

Plan ref: [§5](todo_hub_ai_first_rebuild_plan.md#5-phase-2-current-state-audit)

- [x] **2.1** `docs/audit/current-state.md` — what works today (Todo flows, auth, persistence, build, deploy).
      PR title: `docs(audit): document current state`
      PR: https://github.com/anton415/anton415-hub/pull/98

- [x] **2.2** `docs/audit/problems.md` — failures, AI-readability blockers, technical risks.
      PR title: `docs(audit): document problems and risks`
      PR: https://github.com/anton415/anton415-hub/pull/99

- [x] **2.3** `docs/audit/keep-remove-defer.md` — explicit decisions per area (code, config, infra).
      PR title: `docs(audit): document keep/remove/defer decisions`
      PR: https://github.com/anton415/anton415-hub/pull/100

- [ ] **2.4** `docs/audit/technical-debt.md` — concrete debt items with impact and proposed cleanup phase.
      PR title: `docs(audit): document technical debt`
      PR: _pending_

---

## Phase 3 — System Design

Plan ref: [§6](todo_hub_ai_first_rebuild_plan.md#6-phase-3-system-design)

- [ ] **3.1** `docs/system-design/todo-v1-system-design.md` — full 19-section template per spec §6.2.
      PR title: `docs(system-design): add Todo v1 system design`
      PR: _pending_

- [ ] **3.2** `docs/system-design/domain-model.md` — Task, TaskId, TaskStatus, TaskPriority, TaskTitle, TaskDescription, TaskDates, TaskLifecycle (per spec §8.2).
      PR title: `docs(system-design): add domain model`
      PR: _pending_

- [ ] **3.3** `docs/system-design/data-model.md` — PostgreSQL tables, indexes, constraints, migrations strategy.
      PR title: `docs(system-design): add data model`
      PR: _pending_

- [ ] **3.4** `docs/system-design/api-contract.md` — REST endpoints for Todo v1 (Go backend), request/response shapes, error contracts.
      PR title: `docs(system-design): add API contract`
      PR: _pending_

- [ ] **3.5** `docs/system-design/frontend-architecture.md` — `packages/domain`, `packages/ui`, `packages/config`, `apps/web` layout; state management; routing.
      PR title: `docs(system-design): add frontend architecture`
      PR: _pending_

- [ ] **3.6** `docs/system-design/deployment-model.md` — Yandex Cloud VM, Caddy, Docker, PostgreSQL, GitHub Actions, smoke checks.
      PR title: `docs(system-design): add deployment model`
      PR: _pending_

---

## Phase 4 — AI-First Repository Structure

Plan ref: [§7](todo_hub_ai_first_rebuild_plan.md#7-phase-4-ai-first-repository-structure)

- [ ] **4.1** `docs/adr/0002-ai-first-repository-structure.md` — rationale for the target structure.
      PR title: `docs(adr): add 0002 — AI-first repository structure`
      PR: _pending_

- [ ] **4.2** `docs/adr/0003-github-wiki-for-user-docs.md` — split between repo docs and Wiki.
      PR title: `docs(adr): add 0003 — GitHub Wiki for user docs`
      PR: _pending_

- [ ] **4.3** `ARCHITECTURE.md` at repository root.
      PR title: `docs: add ARCHITECTURE.md`
      PR: _pending_

- [ ] **4.4** `CONTRIBUTING.md` (optional but recommended).
      PR title: `docs: add CONTRIBUTING.md`
      PR: _pending_

- [ ] **4.5** Prompt files: `docs/prompts/ai-review-prompt.md` and `docs/prompts/codex-implementation-prompt.md`.
      PR title: `docs(prompts): add AI review and Codex implementation prompts`
      PR: _pending_

---

## Phase 5 — Claude Design Preparation

Plan ref: [§8](todo_hub_ai_first_rebuild_plan.md#8-phase-5-claude-design-preparation)

- [ ] **5.1** `docs/prompts/claude-design-brief.md` per spec §6.5.
      PR title: `docs(prompts): add Claude Design brief for Todo v1`
      PR: _pending_

- [ ] **5.2** `docs/design/design-review-template.md`.
      PR title: `docs(design): add design review template`
      PR: _pending_

---

## Phase 6 — Architecture Refactor Plan

Plan ref: [§9](todo_hub_ai_first_rebuild_plan.md#9-phase-6-architecture-refactor-plan)

- [ ] **6.1** `docs/refactor/todo-architecture-refactor-plan.md`
      Must contain: current Go-monolith layout vs target (`server/`, `packages/domain`, `packages/ui`, `packages/config`, `apps/web`), file-by-file migration sequence, deletion plan for frozen modules (both `internal/` and `apps/web/src/`), risk register, rollback strategy, verification commands per slice, explicit list of implementation slices.
      After merging: extend `TASKS.md` Phase 7 sub-tasks (7.1, 7.2, …) from this plan's slices.
      PR title: `docs(refactor): add Todo architecture refactor plan`
      Acceptance: every slice is small enough to fit one PR; risks are explicit; rollback is documented.
      PR: _pending_

---

## Phase 7 — Todo Implementation

Plan ref: [§10](todo_hub_ai_first_rebuild_plan.md#10-phase-7-todo-implementation)

> Concrete sub-tasks 7.1, 7.2, … will be appended here after task 6.1 lands. Until then, only the high-level skeleton is recorded.

Skeleton (do not execute these as-is — they must be replaced with refactor-plan slices first):

- [ ] **7.0** Hide non-Todo navigation in `apps/web` (route guards + nav component) before code deletion, so production stays usable.
- [ ] **7.A** Delete frontend frozen-module code (Finance, Calendar, Orchestrator, Investments, FIRE) per refactor plan.
- [ ] **7.B** Delete backend frozen-module code (`internal/`) per refactor plan. Preserve migrations in place; document strategy in an ADR.
- [ ] **7.C** Move `apps/api/` → `server/` per refactor plan.
- [ ] **7.D** Establish `packages/domain`, `packages/ui`, `packages/config` and migrate `apps/web/src/` into them per refactor plan.
- [ ] **7.E** Implement the redesigned Todo UI per Phase 5 brief and Phase 6 plan.
- [ ] **7.F** Empty states, error states, validation polish.
- [ ] **7.G** Tests for critical Todo behaviors (creation, edit, complete, archive/delete, persistence, validation).

---

## Phase 8 — Quality Gates and Production Readiness

Plan ref: [§11](todo_hub_ai_first_rebuild_plan.md#11-phase-8-quality-gates-and-production-readiness)

- [ ] **8.1** `docs/production/production-readiness-checklist.md`.
      PR title: `docs(production): add readiness checklist`
      PR: _pending_

- [ ] **8.2** `docs/production/verification-report.md` (run actual quality gates and record results).
      PR title: `docs(production): add verification report`
      PR: _pending_

- [ ] **8.3** Verify Yandex ID auth flow end-to-end after the Phase 7 refactor.
      PR title: `chore(auth): verify Yandex ID flow after rebuild`
      PR: _pending_

- [ ] **8.4** Verify PostgreSQL backup and restore steps.
      PR title: `docs(production): document backup/restore verification`
      PR: _pending_

---

## Phase 9 — GitHub Wiki Drafts

Plan ref: [§12](todo_hub_ai_first_rebuild_plan.md#12-phase-9-github-wiki-documentation)

- [ ] **9.1** `docs/wiki/Home.md` — PR title: `docs(wiki): add Home draft`
- [ ] **9.2** `docs/wiki/User-Guide.md` — PR title: `docs(wiki): add User Guide draft`
- [ ] **9.3** `docs/wiki/Daily-Todo-Workflow.md` — PR title: `docs(wiki): add Daily Todo Workflow draft`
- [ ] **9.4** `docs/wiki/Task-Lifecycle.md` — PR title: `docs(wiki): add Task Lifecycle draft`
- [ ] **9.5** `docs/wiki/FAQ.md` — PR title: `docs(wiki): add FAQ draft`
- [ ] **9.6** `docs/wiki/Design-Principles.md` — PR title: `docs(wiki): add Design Principles draft`
- [ ] **9.7** `docs/wiki/System-Design-Learning-Notes.md` — PR title: `docs(wiki): add System Design learning notes draft`
- [ ] **9.8** `docs/wiki/Retrospectives.md` — PR title: `docs(wiki): add Retrospectives index draft`

---

## Phase 10 — Retrospective

Plan ref: [§13](todo_hub_ai_first_rebuild_plan.md#13-phase-10-retrospective-and-learning-summary)

- [ ] **10.1** `docs/learning-log/YYYY-MM-DD-todo-ai-first-rebuild-retrospective.md` (replace YYYY-MM-DD with actual date when executing).
      PR title: `docs(learning-log): add rebuild retrospective`
      Acceptance: honest mistakes, trade-offs, lessons, next steps. Suitable to show a mentor.
      PR: _pending_

---

Completed tasks stay in place above with `[x]` and a `PR:` sub-line. Merge history lives in `git log` and the linked PRs; this file does not duplicate it.
