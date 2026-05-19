# ADR 0004 — System Design Before Major Rebuild

## Status

**Accepted** — 2026-05-19.

Binding for the duration of the AI-first rebuild. Gates the start of Phase 6 (refactor plan) and every Phase 7+ task in [`rebuild/TASKS.md`](../../rebuild/TASKS.md). Reviewed when Phase 3 artifacts land or when the spec's §3.4 constraint is itself revisited.

Related:
- [`rebuild/AGENT.md`](../../rebuild/AGENT.md) §1, §2 — cold-start reading order and binding decisions.
- [`rebuild/TASKS.md`](../../rebuild/TASKS.md) Phase 3 (tasks 3.1–3.6) and Phase 6 (task 6.1) — the artifacts this ADR gates on, and the first downstream task that depends on them.
- [`rebuild/todo_hub_ai_first_rebuild_spec.md`](../../rebuild/todo_hub_ai_first_rebuild_spec.md) §3.4 — "System Design Before Major Rebuild" non-negotiable constraint.
- [`rebuild/todo_hub_ai_first_rebuild_spec.md`](../../rebuild/todo_hub_ai_first_rebuild_spec.md) §6.2 — required 19-section System Design document.
- [`rebuild/todo_hub_ai_first_rebuild_spec.md`](../../rebuild/todo_hub_ai_first_rebuild_spec.md) §2.3 — System Design as an explicit learning goal of the rebuild.
- [`docs/adr/0001-focus-on-todo-only.md`](0001-focus-on-todo-only.md) — Todo-only scope, the subject of the System Design.

---

## Context

`anton415-hub` is a single-user hub deployed at `anton415.ru`. Over time it accumulated six module surfaces (Todo, Finance, Calendar, Orchestrator, Investments, FIRE) without an explicit architecture document, target domain model, or written API contract. The audit in [`docs/audit/repo-map.md`](../audit/repo-map.md) captures the resulting state: Go monolith under `apps/api/`, a React app under `apps/web/`, migrations for every started module, and documentation that no longer matches the code.

[ADR 0001](0001-focus-on-todo-only.md) answers *what is in scope* (Todo only). It does not answer:

- What is the Todo domain model? (Task, TaskId, TaskStatus, …)
- What is the target backend layout? `apps/api/` → `server/` is decided in `rebuild/AGENT.md` §2, but the internal package structure is not.
- What is the target frontend layout? `packages/domain`, `packages/ui`, `packages/config`, `apps/web` is the binding decision; the package boundaries inside each are not.
- What is the API contract Todo v1 must satisfy?
- What are the data-model invariants the migrations must enforce?
- What is the deployment model after the refactor?

Phase 6 (`docs/refactor/todo-architecture-refactor-plan.md`, task 6.1) is the document that translates "what we have" into "what we want", file by file. Phase 7 then executes that plan as small slices. Both phases require an explicit target. Without one, every refactor PR re-litigates architecture questions in its own review thread, and the agent has no document to cite when refusing scope drift.

The rebuild is also an explicit learning exercise (spec §2.3, §6.2). System Design is named as one of the four core practices the rebuild must produce reviewable artifacts for. Skipping it would defeat that goal even if the code shipped.

Spec §3.4 already encodes this as a non-negotiable constraint:

> Major implementation work must not start before a System Design stage is completed.
> The System Design does not need to be perfect. It must be explicit, reviewable, and good enough to guide implementation.

This ADR records the decision so that any agent reading only the ADR set — without re-reading the spec — sees the gate and applies it.

---

## Decision

**Phase 3 (System Design) is a gate.** Major implementation work, defined below, does not start until the Phase 3 artifacts are merged.

### What "Phase 3 complete" means

The following six documents must exist on `main` (see [`rebuild/TASKS.md`](../../rebuild/TASKS.md) tasks 3.1–3.6):

1. `docs/system-design/todo-v1-system-design.md` — the 19-section document per spec §6.2.
2. `docs/system-design/domain-model.md` — Task, TaskId, TaskStatus, TaskPriority, TaskTitle, TaskDescription, TaskDates, TaskLifecycle (spec §8.2).
3. `docs/system-design/data-model.md` — PostgreSQL tables, indexes, constraints, migrations strategy.
4. `docs/system-design/api-contract.md` — Go-backed REST endpoints for Todo v1, request/response shapes, error contracts.
5. `docs/system-design/frontend-architecture.md` — `packages/domain`, `packages/ui`, `packages/config`, `apps/web`; state management; routing.
6. `docs/system-design/deployment-model.md` — Yandex Cloud VM, Caddy, Docker, PostgreSQL, GitHub Actions, smoke checks.

### "Good enough", not "perfect"

Per spec §3.4, the System Design does not need to be perfect. It must be:

- **Explicit** — every decision named in [`rebuild/AGENT.md`](../../rebuild/AGENT.md) §2 has a section that elaborates it for Todo v1, not for a hypothetical product.
- **Reviewable** — sized as small PRs (one document per PR, per the §6 acceptance criteria in the plan) so a reviewer can read each in one sitting.
- **Good enough to guide implementation** — Phase 6 must be able to write the refactor plan by citing section numbers. Phase 7 must be able to write code that matches the contract.

Unknowns go into the *Open questions* section (§18 of the main System Design document, spec §6.2). They are not blockers for the gate; they are recorded so future PRs can resolve them with their own ADR.

### What this ADR gates

Forbidden until Phase 3 artifacts are merged:

- Starting task 6.1 (refactor plan).
- Any Phase 7 task: route guards (7.0), frontend or backend deletions (7.A, 7.B), `apps/api/` → `server/` move (7.C), monorepo package introduction (7.D), Todo UI rebuild (7.E), polish (7.F), tests (7.G).
- Any non-trivial code refactor that would prejudice a System Design outcome (e.g. renaming domain types, restructuring `internal/`, choosing a state-management library for `apps/web`).
- Any deletion of frozen-module code beyond what Phase 1 already approves (the doc deletions in task 1.5 are explicitly scoped and pre-approved).

Allowed before the gate opens:

- All Phase 0–2 tasks (preparation, scope freeze, audit).
- The remainder of Phase 1 (README rewrite, superseded-doc deletion).
- Phase 4 (AI-first repository structure documents) and Phase 5 (Claude Design brief) — they consume Phase 3 outputs but produce documentation, not code, and may be drafted in parallel once Phase 3 artifacts begin to exist. They must still cite the relevant System Design sections by the time their PRs land.
- The ADR-0001 production-breaking / security exception: a minimum fix to keep `anton415.ru` running. Such a PR must call out the exception and link to ADR 0001.

### Enforcement

- [`rebuild/AGENT.md`](../../rebuild/AGENT.md) §1 requires every cold-start agent to read the spec's §15 and the relevant plan phase. This ADR adds a concrete gate the agent can apply mechanically: "Is the task in Phase 6 or 7? Are tasks 3.1–3.6 ticked in `rebuild/TASKS.md`? If no, refuse and report."
- PRs that violate the gate must be closed with a link to this ADR. The fix is to land the missing System Design slice first.

---

## Consequences

### Positive

- **A target to refactor toward.** The Phase 6 refactor plan cites the System Design instead of inventing structure on the fly. Reviewers compare PRs against a written contract, not against opinion.
- **Reusable across PRs.** Every Phase 7 slice references the same documents. No re-litigation of "where should this package live?" in each review.
- **Learning value.** The System Design is the single artifact most directly tied to the §2.3 learning goal. Producing it is the point, not an overhead.
- **AI scope discipline.** Cold-start agents have a concrete checklist (six documents) before they may start writing implementation PRs. This is enforceable without human judgement.
- **Open questions are recorded, not forgotten.** Section 18 of the System Design captures what the design intentionally leaves to a later ADR. Future-Anton can scan one list instead of grepping the repo.

### Negative

- **Calendar delay before code work resumes.** Phases 3–5 are documentation-heavy. For a solo developer eager to see code change, this feels slow. Mitigation: spec §2.2 explicitly prefers depth-over-breadth; the one-task-per-PR cadence keeps each document small and shippable.
- **Risk of over-engineering the design.** A 19-section template invites filling every section to its template depth even when the product is one user and seven CRUD endpoints. Mitigation: the "good enough" rule in spec §3.4 and the explicit *Trade-offs / Rejected alternatives* sections (§16, §17) encourage brevity and explicit cuts.
- **Risk of design-implementation drift.** Once Phase 7 begins, the System Design can fall out of sync with the code. Mitigation: System Design documents are living artifacts; Phase 7 PRs that change a contract must update the corresponding section in the same PR. The retrospective in Phase 10 reviews drift.
- **Some Phase 4–5 work is partially blocked.** Phase 4 (`ARCHITECTURE.md`, prompt files) and Phase 5 (Claude Design brief) can be drafted in parallel, but cannot be finalised before Phase 3 stabilises. Their PRs land *after* the dependent System Design sections are merged.

### Neutral

- **Reversibility.** The gate is procedural. If a Phase 3 document turns out to be wrong, it gets revised in a new PR; this ADR does not lock the *content* of the System Design, only the requirement that it exists.
- **No production impact.** Phases 0–6 are documentation-only on the production side (ADR 0001, spec §15.5). Adding a gate before Phase 6 keeps `anton415.ru` running exactly as it does today.

---

## Alternatives considered

### Alternative A — Skip System Design; refactor first, document later

Move `apps/api/` → `server/`, introduce `packages/*`, and write the System Design as the *result* of those moves rather than the cause.

**Rejected because** spec §3.4 names this as the failure mode the rebuild exists to correct. The current repo is what "design via refactor" produces: structure that fits the moment a file was moved, not a target. It also forfeits the learning goal in §2.3 — there is no design artifact to discuss with a mentor.

### Alternative B — Single combined System Design document

Write one large `docs/system-design.md` containing all 19 sections plus domain, data, API, frontend, and deployment in one file.

**Rejected because** it violates the one-task-one-PR cadence in `rebuild/AGENT.md` §2. A combined document would be reviewed once superficially and never again. The six-document split (tasks 3.1–3.6) keeps each PR small enough to read end-to-end.

### Alternative C — Defer System Design until after Phase 6 refactor

Treat the refactor as a "preparation" step and write the System Design once the new package layout is in place.

**Rejected because** Phase 6 is precisely the work that needs a written target. Without the System Design as input, the refactor plan would either invent structure on the spot (collapsing the gate into the refactor PR review) or freeze indefinitely while reviewers re-derive the same target.

### Alternative D — Replace System Design with ADRs only

Capture every architectural decision in an ADR and rely on the ADR set as the design baseline.

**Rejected because** ADRs and the System Design answer different questions. ADRs record *decisions and the reasoning behind them*; the System Design records the *shape of the system* — domain model, API surface, data layout, deployment topology — in one place. Both are required. ADRs alone leave the system with a list of choices and no map.

### Alternative E — Make System Design optional ("nice to have")

Recommend the System Design but allow Phase 6/7 to proceed without it if the author is confident.

**Rejected because** "if the author is confident" is the regime that produced the half-finished modules ADR 0001 freezes. Confidence is exactly what spec §3.4 refuses to accept as a substitute for an explicit document. A non-binding recommendation here is functionally equivalent to alternative A.
