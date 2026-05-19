# AI Working Rules

> **Cold-start entry point for AI agents working on `anton415-hub` code.**
> Read this file before changing anything in the repository.
> If you are executing a rebuild task from the phased plan, also read [`rebuild/AGENT.md`](rebuild/AGENT.md) and find the first unchecked task in [`rebuild/TASKS.md`](rebuild/TASKS.md).

---

## 1. Project Goal

`anton415-hub` is a **personal Todo Hub for one user (Anton)**, deployed at `anton415.ru`.

It is also a learning project: the rebuild process itself produces explicit, reviewable artifacts (System Design, ADRs, audits, retrospectives). Optimize for **depth over breadth** — a single well-designed Todo module with clear architecture is more valuable than many half-finished modules.

The project is not a team product, not a SaaS, and not a marketplace. Do not design for multi-user, public registration, organizations, or sharing.

---

## 2. Current Priority

The repository is in the middle of a **Todo-only AI-first rebuild**. The phased plan and source-of-truth documents live in [`rebuild/`](rebuild/):

- [`rebuild/AGENT.md`](rebuild/AGENT.md) — cold-start workflow for rebuild tasks.
- [`rebuild/TASKS.md`](rebuild/TASKS.md) — operational checklist (one task = one PR).
- [`rebuild/todo_hub_ai_first_rebuild_spec.md`](rebuild/todo_hub_ai_first_rebuild_spec.md) — what must be true. §15 is binding.
- [`rebuild/todo_hub_ai_first_rebuild_plan.md`](rebuild/todo_hub_ai_first_rebuild_plan.md) — phased methodology.

**Conflict rule:** if any document disagrees with `rebuild/AGENT.md` or `rebuild/TASKS.md`, the rebuild files win.

---

## 3. Active Scope

| Module | Status |
|---|---|
| Todo | **Active** — the only module being developed |

Todo v1 must let one user create, edit, complete, archive/delete, prioritize, and view tasks; persist data safely; and be usable on desktop and mobile.

---

## 4. Frozen Scope

The following modules exist in code today but are **frozen**. Do not extend them, fix non-blocking bugs in them, or restore them. They will be removed from `internal/` and `apps/web/src/` in Phase 7 of the rebuild per a documented refactor plan.

| Module | Status |
|---|---|
| Finance | Frozen — code to be removed in Phase 7; PostgreSQL migrations preserved in `migrations/` for potential restore |
| Calendar | Frozen — code to be removed |
| Orchestrator | Frozen — code to be removed |
| Investments | Frozen — placeholder; to be removed entirely |
| FIRE | Frozen — placeholder; to be removed entirely |
| News | Never started — out of scope |
| AI chat | Never started — out of scope |

Do **not** add new modules. Adding Calendar, Finance, News, Orchestrator, AI chat, multi-user collaboration, public registration, team task management, complex analytics, gamification, social features, or microservice decomposition is forbidden until Todo reaches the readiness criteria defined in `rebuild/todo_hub_ai_first_rebuild_spec.md` §4.4.

---

## 5. Architecture Rules

- **Backend stays on Go.** `go.mod` is preserved. The current entry point is `apps/api/main.go`; it will move to `server/` in Phase 7 per the refactor plan, not before.
- **Frontend stays on Vite + React + TypeScript + Tailwind v4.** No framework changes. The target monorepo layout is `packages/domain`, `packages/ui`, `packages/config`, `apps/web/` — migration happens in Phase 7, not by ad-hoc moves.
- **Keep domain logic separate from UI.** Todo domain concepts (`Task`, `TaskId`, `TaskStatus`, `TaskPriority`, `TaskTitle`, `TaskDescription`, `TaskDates`, `TaskLifecycle`) are explicit and live outside React components.
- **Keep persistence concerns separate from domain logic.** PostgreSQL access stays behind narrow interfaces.
- **Prefer small files with narrow responsibility.** AI-first code is predictable code.
- **Prefer explicit contracts** (validation schemas, typed API request/response shapes) over implicit conventions.
- **Auth is Yandex ID + server-side session cookies.** It already works in production; do not redesign auth in this rebuild.
- **No new frameworks, runtimes, or major dependencies without an ADR** in `docs/adr/`.
- **No bulk file moves or large refactors without a written migration plan.** Phase 6 of the rebuild is the gate for that work.

---

## 6. Coding Rules

- One concern per file. If a file grows past a few hundred lines or covers more than one concept, split it.
- Names communicate intent (`completeTask`, not `handleClick3`). Avoid abbreviations that require context to decode.
- Validate at system boundaries (HTTP handlers, database adapters, user input). Trust internal calls.
- Do not add error handling, fallbacks, or feature flags for scenarios that cannot happen.
- Default to no comments. Add a comment only when the *why* is non-obvious — a hidden constraint, a workaround for a specific bug, a subtle invariant. Do not narrate *what* the code does.
- Do not introduce backwards-compatibility shims, `// removed` markers, or unused re-exports. If something is unused, delete it.
- Do not commit secrets. `.env.example` is the template; real values live outside the repo.

---

## 7. Testing Rules

Tests focus on **critical Todo behavior**, not coverage targets:

- task creation;
- task editing;
- task completion;
- task deletion or archive;
- persistence behavior (round-trip through PostgreSQL);
- validation;
- empty-state rendering;
- error handling.

Current state (per [`docs/audit/repo-map.md`](docs/audit/repo-map.md)):

- Backend tests: `go test ./...` runs real Go tests.
- Frontend tests: `npm run test:run` and `npm run test:e2e` are placeholders today. Real frontend tests are introduced as part of Phase 7 (task 7.G).

Do not mock the database in backend integration tests when a real Postgres is available via `docker compose` — mock/prod divergence has bitten this project before.

---

## 8. Documentation Rules

- **Repository docs are for developers and AI agents.** GitHub Wiki (Phase 9) is for user-facing and learning-facing documentation. Do not duplicate the two.
- New decisions about architecture, scope, or process land as **ADRs** under `docs/adr/` (`Status`, `Context`, `Decision`, `Consequences`, `Alternatives`).
- Audits, repository maps, current-state snapshots live under `docs/audit/`.
- System Design documents live under `docs/system-design/`.
- Prompts that the project depends on (review prompts, design briefs, Codex implementation prompts) live under `docs/prompts/`.
- Retrospectives live under `docs/learning-log/` with `YYYY-MM-DD` prefixes.
- Update docs **in the same PR** as the behavior change they describe. Stale docs are worse than missing docs.
- Legacy documents listed in `rebuild/AGENT.md` §2 (`ANALYSIS.md`, `PLAN.md`, `CHANGELOG.md`, and most of the pre-rebuild `docs/` tree) were removed in rebuild task 1.5. Do not recreate or rely on them; the Phase 0 snapshot in [`docs/audit/repo-map.md`](docs/audit/repo-map.md) records what was deleted.

---

## 9. Forbidden Actions

- Adding any feature outside Todo v1.
- Reintroducing Finance, Calendar, Orchestrator, Investments, FIRE, News, AI chat, or any other module.
- Bulk file moves or destructive refactors without a written migration plan (Phase 6 is the gate).
- Skipping or bypassing quality gates (`--no-verify`, `--no-gpg-sign`, etc.).
- `git push --force`, `git reset --hard`, `git rebase -i` without explicit user approval.
- Editing CI (`.github/workflows/`), deploy configs (`deploy/`, `docker-compose.yml`, `Dockerfile`, `Caddyfile`), or migrations (`migrations/`) without explicit per-PR user approval.
- Touching the `anton415.ru` production database or running migrations against production.
- Auto-proceeding to the next task in `rebuild/TASKS.md` after completing the current one — stop and wait for the user.
- Generating placeholder or fake PR/commit URLs. Only fill the URL after the PR actually exists.

---

## 10. Quality Gates

Run what is applicable to the change and document the results in the PR body. If a gate fails, fix the root cause; do not bypass.

### Docs-only changes

Quality gates may be N/A — state that explicitly in the PR body.

### Backend (Go)

```bash
go test ./...
go vet ./...
go build ./...
golangci-lint run   # if installed
```

The `Makefile` provides shortcuts: `make test` (Go + frontend), `make lint` (`gofmt -l`, `go vet`, frontend `npm run check`), `make build`.

### Frontend (`apps/web/`)

Current scripts (see `apps/web/package.json`):

```bash
npm run check    # typecheck via tsc --noEmit
npm run build    # tsc --noEmit && vite build
```

`npm run test:run` and `npm run test:e2e` are placeholders today and pass trivially. Real test commands are introduced in Phase 7. After the `packages/` migration in Phase 7, the target gates become `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` — discover and document the actual commands as they land.

### Production safety

`anton415.ru` is live. Every PR up through Phase 6 of the rebuild must leave production runnable. Phase 7 sub-tasks coordinate the actual code/route removals; that is the only place where prod-visible changes happen, and they require explicit user approval.

---

## 11. Per-PR Workflow Summary

- **One task in `rebuild/TASKS.md` = one PR.** No batched PRs.
- Conventional commit prefixes: `docs:`, `refactor:`, `feat(todo):`, `test(todo):`, `chore:`.
- Branch name: `claude/<task-id>-<short-slug>` (e.g. `claude/1.1-ai-md`).
- The PR ticks the corresponding `- [ ]` to `- [x]` in `rebuild/TASKS.md` and records the PR URL.
- After the PR is opened, **stop**. Do not start the next task.

If something is unclear — the task seems too large, acceptance criteria require judgment, the plan and `TASKS.md` disagree — produce a draft, stop, and ask the user before proceeding.
