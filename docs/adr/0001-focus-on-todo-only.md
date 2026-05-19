# ADR 0001 — Focus on Todo Only

## Status

**Accepted** — 2026-05-19.

Binding for the duration of the AI-first rebuild. Supersedes any older roadmap document that lists Finance, Calendar, Orchestrator, Investments, or FIRE as active work.

Related:
- [`rebuild/AGENT.md`](../../rebuild/AGENT.md) — workflow rules and binding decisions.
- [`rebuild/TASKS.md`](../../rebuild/TASKS.md) — operational checklist (task 1.2 created this ADR).
- [`rebuild/todo_hub_ai_first_rebuild_spec.md`](../../rebuild/todo_hub_ai_first_rebuild_spec.md) §3.1, §4, §15 — Todo-only scope, readiness criteria, and project-specific binding decisions.
- [`AI.md`](../../AI.md) §3–§4 — active and frozen scope as enforced for AI agents.

This decision is revisited only when Todo v1 meets all readiness criteria in spec §4.4. Until then, no module may be unfrozen.

---

## Context

`anton415-hub` is a personal hub for a single user (Anton), deployed at `anton415.ru`. Over time the repository accumulated multiple half-finished modules:

| Module | State on 2026-05-19 |
|---|---|
| Todo | Functional; daily use; the only module that delivers user value today |
| Finance | Partial implementation with code in `internal/` and `apps/web/src/`, plus PostgreSQL migrations |
| Calendar | Partial implementation |
| Orchestrator | Partial implementation |
| Investments | Placeholder only |
| FIRE | Placeholder only |
| News, AI chat | Never started |

The hub is built and maintained by one person with AI assistance. Spreading effort across six module surfaces produced the predictable outcome: every module is mediocre, none is production-quality, and the documentation no longer matches the code (see `docs/audit/repo-map.md` from task 0.2 for the snapshot).

In parallel, the project is also a **learning vehicle** — the rebuild is meant to produce explicit, reviewable artifacts (System Design, ADRs, audits, retrospectives) suitable to show a mentor. Half-finished modules damage that goal too: they leave no document where decisions can be cleanly recorded.

The rebuild plan therefore needs an unambiguous answer to "what is in scope right now?" before any audit, design, or refactor work begins. Without that anchor, every Phase 2–7 task would re-litigate the same question.

---

## Decision

**Todo is the only active module.** All other modules are **frozen**.

Concretely:

1. **No new feature work, bug fixes, refactors, or documentation effort** is spent on Finance, Calendar, Orchestrator, Investments, FIRE, News, or AI chat. Non-blocking bugs in frozen modules are not fixed; they are ignored until the module is removed.
2. **No new modules** may be introduced until Todo v1 satisfies the readiness criteria in `rebuild/todo_hub_ai_first_rebuild_spec.md` §4.4 (reliable persistence, mobile-usable, tested core flows, passing quality gates, current `README.md` / `AI.md` / System Design / ADRs / Wiki / retrospective).
3. **Frozen-module code stays in the tree** through Phases 0–6 to keep production running on `anton415.ru`. Code removal happens in **Phase 7** sub-tasks only, after Phase 6 produces an explicit refactor plan with a rollback strategy (see [`rebuild/TASKS.md`](../../rebuild/TASKS.md) Phase 6 / Phase 7).
4. **PostgreSQL migrations for removed modules are preserved** in `migrations/` rather than dropped. The choice between "keep tables in prod" and "drop with backup" is deferred to a separate ADR alongside the Phase 6 refactor plan.
5. **Documentation enforcement.** [`AI.md`](../../AI.md) §3–§4 and [`rebuild/AGENT.md`](../../rebuild/AGENT.md) §2, §4 list frozen modules explicitly and forbid reintroducing them. Any AI agent reading the cold-start entry point will refuse module-expansion requests.

This decision is documentation-only. No code is moved, deleted, or rewritten by this ADR — Phase 1 of the rebuild is intentionally non-destructive.

---

## Consequences

### Positive

- **Depth over breadth.** One module receives all design, testing, and documentation effort. Spec §2.2 explicitly prefers a single well-designed Todo module to many half-finished ones.
- **Clear AI scope.** Cold-start agents read `AI.md` → `rebuild/AGENT.md` → this ADR and stop trying to "help" by touching frozen modules. Reduces wasted PRs and review effort.
- **Cleaner architecture decisions.** With one active domain, the System Design document (Phase 3) and the target monorepo layout (`packages/domain`, `packages/ui`, `packages/config`, `apps/web`, `server/`) can be evaluated against real, concrete requirements instead of speculation across five domains.
- **Learning artifacts become writeable.** ADRs, audits, and retrospectives have a coherent subject. Without a scope anchor, every document would need a "but also Finance" caveat.
- **Production stays runnable.** Because the freeze is documentation-only until Phase 7, `anton415.ru` continues serving the existing modules through Phases 0–6 (spec §15.5).

### Negative

- **Visible feature regression once Phase 7 lands.** When non-Todo navigation is hidden (task 7.0) and module code is deleted (tasks 7.A / 7.B), the production app loses Finance, Calendar, and Orchestrator screens. The single user is also the developer and accepts this trade-off; an external user would not.
- **Sunk-cost discomfort.** Code that was written over months is queued for removal. The mitigation is preserving migrations and producing a Phase 6 refactor plan with rollback — frozen modules can be restored from git history and migrations if a future scope change resurrects them.
- **Deferred cross-module ideas.** Any concept that requires Todo + Calendar (e.g. due-date reminders synced to a calendar) or Todo + Finance is postponed indefinitely. Optional Todo v1.x items (tags, due dates, recurring tasks — spec §4.2) stay in-scope but only inside the Todo module.
- **Risk of scope drift back.** Solo developers under pressure tend to "just add one small thing." The forbidden-actions sections of `AI.md` §9 and `rebuild/AGENT.md` §4 make this explicit so future-Anton (or any AI agent) has to type out a justification before reverting the decision.

### Neutral

- **Reversibility.** The decision is reversible at the schema level (migrations preserved) and at the code level (git history). Reversing it after Phase 7 still costs real work — restoring UI, refactoring back into the new monorepo layout, re-testing — but the data is not destroyed.
- **No effect on auth.** Yandex ID sessions and PostgreSQL persistence are kept (spec §15.2). The freeze does not redesign authentication.

---

## Alternatives considered

### Alternative A — Keep all modules; improve them in parallel

Continue maintaining Finance, Calendar, and Orchestrator alongside Todo, with smaller per-module budgets.

**Rejected because** this is the status quo that produced the current state: six mediocre modules, none production-quality, documentation drifting from code. With a single developer there is no realistic budget split that yields a production-grade module in any of them within the learning timeframe. Spec §2.1 explicitly forbids this path.

### Alternative B — Delete frozen-module code immediately

Treat Phase 1 as destructive: drop `internal/finance/`, `internal/calendar/`, `internal/orchestrator/`, and the corresponding `apps/web/src/modules/*` in a single PR.

**Rejected because** `rebuild/AGENT.md` §4 forbids bulk file moves without a documented migration plan, and `rebuild/todo_hub_ai_first_rebuild_spec.md` §15.5 requires production to keep running through Phases 0–6. The refactor plan (task 6.1) is the gate for destructive changes; jumping past it removes the audit trail and the rollback strategy that justify the deletion.

### Alternative C — Pick a different anchor module (Finance or Calendar)

Treat Finance or Calendar as the active scope instead of Todo.

**Rejected because** Todo is the only module already in daily use, has the smallest design surface for a System Design exercise (single primary entity, no external integrations, no scheduling math, no money), and matches the learning goals in spec §2.3 with the lowest accidental complexity. Picking Finance would force the rebuild to also design tax/account/transaction semantics on top of the rebuild process itself.

### Alternative D — Pause everything; start a new repository

Archive `anton415-hub` and start fresh with only Todo.

**Rejected because** auth (Yandex ID), the production VM, Caddy/Docker setup, PostgreSQL persistence, and GitHub Actions already work. A green-field repository would re-pay all of that cost for no design benefit. Keeping the existing repo and freezing scope captures the same outcome as a fresh start, plus a git history that documents the lesson.

### Alternative E — Soft-freeze: read-only modules

Keep frozen modules visible and working in production, just stop developing them.

**Rejected because** "visible and working" still costs review attention, accumulates technical debt, and contradicts the AI-first goal of small, narrow files (spec §3.2). The current decision instead removes them in Phase 7 after a documented plan — strictly cleaner, with migrations preserved so the data is not lost.
