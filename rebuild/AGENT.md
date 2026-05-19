# Rebuild Agent Instructions

> **Cold-start entry point for AI agents working on the anton415-hub Todo-only AI-first rebuild.**
> Read this file first in every new chat session.

---

## 1. What to read on cold start (in order)

1. **This file (`rebuild/AGENT.md`)** — workflow rules and binding decisions.
2. **`rebuild/TASKS.md`** — the operational checklist. Find the first unchecked task.
3. **`rebuild/todo_hub_ai_first_rebuild_spec.md`** — what must be true. Especially §15 (project-specific decisions, binding).
4. **`rebuild/todo_hub_ai_first_rebuild_plan.md`** — phased methodology. Open the section matching the task's phase.
5. Any phase-specific files this particular task depends on (e.g., `docs/audit/repo-map.md` for Phase 2 tasks).

**Conflict rule:** if anything in spec/plan disagrees with this file or `TASKS.md`, **this file and TASKS.md win**. The spec and plan are templates; AGENT.md + TASKS.md are the project-specific adaptation.

---

## 2. Binding decisions for anton415-hub

| Topic | Decision |
|---|---|
| Active module | **Todo only**. Finance, Calendar, Orchestrator, Investments, FIRE are all frozen and will be removed from code in Phase 7. |
| Backend language | **Go stays.** Move `apps/api/` → `server/` in Phase 7. Quality gates: `go test ./...`, `go vet ./...`, `go build ./...`, `golangci-lint run`. |
| Frontend layout | **JS monorepo:** `packages/domain`, `packages/ui`, `packages/config`, `apps/web`. Stack stays Vite + React + TS + Tailwind v4. |
| Frozen module code | Deleted from `internal/` and `apps/web/src/` in Phase 7 per Phase 6 refactor plan. **Migrations are preserved** in `migrations/` for potential restore. |
| Auth | Yandex ID + session cookies kept (production already uses it). Do not redesign auth in this rebuild. |
| Old documentation | Snapshot in `docs/audit/repo-map.md` (task 0.2), then **deleted in Phase 1 (task 1.5)**: `ANALYSIS.md`, `PLAN.md`, `CHANGELOG.md`, `docs/specs/`, `docs/design/`, `docs/modules/`, `docs/architecture.md`, `docs/dev-setup.md`, `docs/roadmap.md`, `docs/migration.md`, `docs/production.md`, `docs/doc-inventory.md`, `docs/dependency-updates.md`, `docs/github-actions.md`, `docs/github-feature-ritual.md`, `docs/yandex-cost-estimate.md`. |
| Commit granularity | **1 task in TASKS.md = 1 PR.** Conventional prefixes: `docs:`, `refactor:`, `feat(todo):`, `test(todo):`, `chore:`. |
| Production | `anton415.ru` is live. Every PR up through Phase 6 must leave production runnable. Phase 7 sub-tasks coordinate the actual code/route removals; that's the only place where prod-visible changes happen. |

---

## 3. Per-chat workflow

The user will typically say *"выполни следующую задачу"* or *"execute next task"*.

Steps:

1. Read `rebuild/AGENT.md` (this file).
2. Read `rebuild/TASKS.md`. Find the **first** task with `- [ ]`. That is the task.
3. Read the phase section in `rebuild/todo_hub_ai_first_rebuild_plan.md` that matches this task's phase. Re-read §15 of the spec.
4. Read any files the task needs to inspect (don't rely on memory).
5. Plan and execute the task as a single small PR:
   - New branch name: `claude/<phase>-<task-id>-<short-slug>` (matches existing pattern from history).
   - PR title prefix per §15.6 of spec.
   - PR body: summary, link to AGENT.md / TASKS.md / phase section, test plan.
6. Update `rebuild/TASKS.md` **in the same PR**: change `- [ ]` directly to `- [x]` and append the PR URL on a sub-line. **No intermediate `[~]` "PR open" state** — solo developer, no concurrency risk; the box flips once when the PR for the task is opened, and the URL is the record. Do not append `• open` / `• merged YYYY-MM-DD` decoration.
7. **Stop. Do not auto-proceed to the next task.** Report the PR URL back to the user and wait.

If the task requires human judgment (ADR content, scope calls, design decisions), produce a draft and stop for user review before pushing further changes.

---

## 4. Forbidden actions

- Adding any feature outside Todo v1.
- Reintroducing Finance, Calendar, Orchestrator, Investments, FIRE, News, AI chat, or any other module.
- Bulk file moves without a documented migration plan (Phase 6 is the gate for that).
- Auto-proceeding to the next task in `TASKS.md` after completing the current one.
- Treating the generic spec/plan as overriding AGENT.md or TASKS.md.
- Skipping or bypassing quality gates.
- `git push --force`, `git reset --hard`, `--no-verify`, `--no-gpg-sign`, `git rebase -i`.
- Editing CI (`.github/workflows/`), deploy configs (`deploy/`, `docker-compose.yml`, `Dockerfile`, `Caddyfile`), or migrations (`migrations/`) without explicit per-PR user approval.
- Touching `anton415.ru` production database or running migrations against prod.
- Generating fake commit URLs in `TASKS.md`. Only fill the URL after the PR actually exists.

---

## 5. Quality gates per PR

Run what is applicable and document results in the PR body.

**Docs-only PRs (Phases 0–5, 8–10 wiki/retro):** quality gates may be N/A. State that explicitly.

**Code PRs (Phase 7+):**
- Backend: `go test ./...` • `go vet ./...` • `go build ./...` • `golangci-lint run` (if installed).
- Frontend: `npm run typecheck` • `npm run lint` • `npm test` • `npm run build` (commands may evolve — discover and document the actual ones).
- If a gate fails, fix the root cause. Never bypass.

---

## 6. Task structure template

When executing a task, structure your own plan as:

```
Goal:            <one-line summary>
Phase:           <phase number and title>
Spec sections:   <§§ that apply, including §15>
Constraints:     <forbidden actions specific to this task>
Files to inspect: <paths>
Output:          <files created/modified>
Quality gates:   <commands to run, or "N/A — docs only">
Definition of done: <how to verify; checks acceptance criteria from plan §>
```

Use this to plan before touching files. Put a condensed version in the PR body.

---

## 7. When something is unclear

- If TASKS.md is missing a task that the plan calls for: stop, propose adding it, wait for user approval.
- If TASKS.md has a task the plan does not describe: ask before executing.
- If the current task seems too large to fit one PR: propose a split, do not silently shrink scope.
- If acceptance criteria require judgment outside the agent's confidence: produce a draft, stop, ask.

The single most valuable thing this rebuild produces is **explicit, reviewable artifacts**. Quiet shortcuts destroy that value.
