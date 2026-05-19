# Todo Hub AI-First Rebuild Execution Plan

## 1. Plan Purpose

This plan describes the phased execution of the Todo-only AI-first rebuild.

It should be used together with:

```text
todo_hub_ai_first_rebuild_spec.md
```

The specification defines what must be true. This plan defines how to execute the work step by step.

The plan is intended to be passed to Claude, Claude Code, Codex, or another AI engineering assistant. Work should be completed gradually, with human review after each phase.

---

## 2. Execution Principles

### 2.1 Work in Phases

Do not attempt to rebuild the full project in one step.

Use this sequence:

```text
Phase 0: Preparation
Phase 1: Scope Freeze
Phase 2: Current State Audit
Phase 3: System Design
Phase 4: AI-First Repository Structure
Phase 5: Claude Design Preparation
Phase 6: Architecture Refactor Plan
Phase 7: Todo Implementation
Phase 8: Quality Gates and Production Readiness
Phase 9: GitHub Wiki Documentation
Phase 10: Retrospective and Learning Summary
```

### 2.2 Human Review Gates

After each phase, stop and request review before proceeding to the next phase.

Each review should answer:

```text
- What changed?
- Why did it change?
- What risks remain?
- What should be done next?
```

### 2.3 No Scope Expansion

Claude must not add new modules.

The only active module is Todo.

### 2.4 Prefer Small Pull Requests / Commits

Each phase should be implemented as one or more small, understandable commits.

Suggested commit style:

```text
docs: ...
refactor: ...
feat(todo): ...
test(todo): ...
chore: ...
```

---

## 3. Phase 0: Preparation

### Goal

Prepare the repository for a controlled rebuild.

### Tasks

1. Inspect the current repository structure.
2. Identify existing package manager and scripts.
3. Identify current frontend/backend structure.
4. Identify existing Todo implementation.
5. Identify any existing modules other than Todo.
6. Identify current documentation.
7. Identify current deployment/configuration files.

### Output Artifacts

```text
docs/audit/repo-map.md
```

### Acceptance Criteria

```text
- Repository structure is documented.
- Main app entry points are identified.
- Existing scripts are listed.
- Todo-related files are identified.
- Non-Todo files/modules are identified.
```

### Claude Prompt

```text
Goal:
Inspect the repository and create an initial repository map for the Todo-only AI-first rebuild.

Context:
This project is being rebuilt as a Todo-only, AI-first learning project. Do not modify business logic yet.

Constraints:
Do not delete files. Do not rename files. Do not implement features. Only inspect and document.

Expected output:
Create docs/audit/repo-map.md with repository structure, current scripts, Todo-related files, non-Todo files, and initial risks.

Definition of done:
The repo map is clear enough for another AI agent to understand where the current Todo implementation lives.
```

---

## 4. Phase 1: Scope Freeze

### Goal

Make Todo the only active project scope.

### Tasks

1. Create or update `AI.md`.
2. Create ADR: `0001-focus-on-todo-only.md`.
3. Create ADR: `0004-system-design-before-rebuild.md`.
4. Update README with current rebuild direction.
5. Mark all non-Todo modules as frozen in documentation.
6. If the UI has navigation to non-Todo modules, prepare a separate implementation plan to hide or remove it later.

### Output Artifacts

```text
AI.md
docs/adr/0001-focus-on-todo-only.md
docs/adr/0004-system-design-before-rebuild.md
README.md
```

### Acceptance Criteria

```text
- Todo-only scope is explicit.
- Frozen modules are listed.
- AI agents are instructed not to add new modules.
- System Design stage is required before major rebuild.
```

### Claude Prompt

```text
Goal:
Freeze the project scope to Todo-only and create the initial AI working rules.

Context:
The project must stop expanding into Calendar, Finance, News, Orchestrator, and other modules until Todo is production-ready.

Constraints:
Do not implement Todo behavior yet. Do not delete frozen modules yet unless explicitly approved. This phase is documentation-first.

Expected output:
Create/update AI.md, README.md, and ADRs for Todo-only scope and System Design before major rebuild.

Definition of done:
A new AI agent opening the repository understands that only Todo is active and all other modules are frozen.
```

---

## 5. Phase 2: Current State Audit

### Goal

Understand the current state before making architecture changes.

### Tasks

1. Review Todo implementation.
2. Review UI structure.
3. Review state management.
4. Review persistence/data flow.
5. Review styling approach.
6. Review tests.
7. Review build and lint setup.
8. Identify technical debt.
9. Identify AI-readability problems.
10. Identify what to keep, remove, defer, or rewrite.

### Output Artifacts

```text
docs/audit/current-state.md
docs/audit/problems.md
docs/audit/keep-remove-defer.md
docs/audit/technical-debt.md
```

### Acceptance Criteria

```text
- Current Todo behavior is documented.
- Main problems are documented.
- Keep/remove/defer decisions are documented.
- Technical debt is documented.
- AI-first blockers are documented.
```

### Claude Prompt

```text
Goal:
Audit the current Todo implementation and supporting code.

Context:
Before refactoring, we need a truthful current-state analysis.

Constraints:
Do not refactor yet. Do not implement features. Do not fix issues unless they block audit.

Expected output:
Create docs/audit/current-state.md, problems.md, keep-remove-defer.md, and technical-debt.md.

Definition of done:
The audit explains what exists, what works, what is risky, what should be preserved, and what should be changed later.
```

---

## 6. Phase 3: System Design

### Goal

Create a System Design document for Todo Hub v1.

### Tasks

1. Define context.
2. Define goals.
3. Define non-goals.
4. Define user model.
5. Define functional requirements.
6. Define non-functional requirements.
7. Define domain model.
8. Define data model.
9. Define API model if backend/API exists or is planned.
10. Define frontend architecture.
11. Define backend architecture if applicable.
12. Define security model.
13. Define persistence strategy.
14. Define deployment model.
15. Define observability approach.
16. Define AI-first architecture rules.
17. Document trade-offs.
18. Document rejected alternatives.
19. Document open questions.
20. Define acceptance criteria.

### Output Artifacts

```text
docs/system-design/todo-v1-system-design.md
docs/system-design/domain-model.md
docs/system-design/data-model.md
docs/system-design/api-contract.md
docs/system-design/frontend-architecture.md
docs/system-design/deployment-model.md
```

### Acceptance Criteria

```text
- Todo v1 has explicit System Design.
- Non-goals prevent scope creep.
- Domain model is clear.
- Data model is clear.
- Frontend architecture is clear.
- Trade-offs are documented.
- Open questions are listed.
```

### Claude Prompt

```text
Goal:
Create a System Design for Todo Hub v1.

Context:
Anton is learning System Design. The document must be educational, explicit, and practical. It should guide implementation, not be abstract theory.

Constraints:
Do not add new product modules. Do not design microservices. Do not design multi-user collaboration. Keep the solution appropriate for a one-user Todo app.

Expected output:
Create docs/system-design/todo-v1-system-design.md and supporting documents for domain model, data model, API contract, frontend architecture, and deployment model.

Definition of done:
The System Design is clear enough that implementation can begin without guessing the product scope or architecture direction.
```

---

## 7. Phase 4: AI-First Repository Structure

### Goal

Prepare repository structure and conventions for AI-assisted development.

### Tasks

1. Create ADR: `0002-ai-first-repository-structure.md`.
2. Create or update `ARCHITECTURE.md`.
3. Create or update `CONTRIBUTING.md` if useful.
4. Define file/folder responsibilities.
5. Define naming conventions.
6. Define testing conventions.
7. Define documentation update rules.
8. Define quality gates.
9. Create `docs/prompts/ai-review-prompt.md`.
10. Create `docs/prompts/codex-implementation-prompt.md`.

### Output Artifacts

```text
docs/adr/0002-ai-first-repository-structure.md
ARCHITECTURE.md
CONTRIBUTING.md
docs/prompts/ai-review-prompt.md
docs/prompts/codex-implementation-prompt.md
```

### Acceptance Criteria

```text
- AI agents have clear repository rules.
- Architecture overview exists.
- Prompt files exist.
- Quality gates are documented.
```

### Claude Prompt

```text
Goal:
Create AI-first repository documentation and conventions.

Context:
The codebase should be easy for AI agents to inspect, modify, test, and document without guessing structure.

Constraints:
Do not perform major file moves yet unless a migration plan is written first.

Expected output:
Create ADR for AI-first structure, ARCHITECTURE.md, optional CONTRIBUTING.md, and prompt files for AI review and implementation.

Definition of done:
A new AI coding agent can understand project structure, rules, quality gates, and forbidden actions before editing code.
```

---

## 8. Phase 5: Claude Design Preparation

### Goal

Prepare a clear design brief for Claude Design.

### Tasks

1. Create `docs/prompts/claude-design-brief.md`.
2. Define design goals.
3. Define user profile.
4. Define screens.
5. Define component inventory.
6. Define mobile requirements.
7. Define empty states.
8. Define error states.
9. Define forbidden design directions.
10. Define expected Claude Design outputs.

### Output Artifacts

```text
docs/prompts/claude-design-brief.md
docs/design/design-review-template.md
```

### Acceptance Criteria

```text
- Claude Design brief is ready to paste into Claude Design.
- Design scope is Todo-only.
- Required screens are listed.
- Visual constraints are clear.
- Design review template exists.
```

### Claude Prompt

```text
Goal:
Create a Claude Design brief for Todo Hub v1.

Context:
Claude Design will be used to redesign the UI/UX. The design must follow the System Design and must not expand the product beyond Todo.

Constraints:
Do not design Calendar, Finance, News, Orchestrator, or AI chat. Avoid overloaded dashboards, gamification, and visual noise.

Expected output:
Create docs/prompts/claude-design-brief.md and docs/design/design-review-template.md.

Definition of done:
The brief can be copied into Claude Design and should produce a calm, focused Todo UI suitable for desktop and mobile implementation.
```

---

## 9. Phase 6: Architecture Refactor Plan

### Goal

Plan the code refactor before making major changes.

### Tasks

1. Compare current code structure against target architecture.
2. Identify required file moves.
3. Identify required component splits.
4. Identify domain logic extraction opportunities.
5. Identify persistence/data-flow changes.
6. Identify risky changes.
7. Define migration sequence.
8. Define rollback strategy.
9. Define verification commands.
10. Define implementation slices.

### Output Artifacts

```text
docs/refactor/todo-architecture-refactor-plan.md
```

### Acceptance Criteria

```text
- Refactor plan exists before major code changes.
- Risky changes are identified.
- Migration sequence is small and reviewable.
- Verification commands are listed.
```

### Claude Prompt

```text
Goal:
Create an architecture refactor plan for Todo Hub v1.

Context:
The project should move toward an AI-first structure, but destructive rewrites are forbidden without a plan.

Constraints:
Do not refactor yet. Do not delete large code sections. Do not move files without explaining migration steps.

Expected output:
Create docs/refactor/todo-architecture-refactor-plan.md with current vs target structure, migration steps, risks, rollback strategy, and verification commands.

Definition of done:
The plan is safe enough that implementation can be done in small commits.
```

---

## 10. Phase 7: Todo Implementation

### Goal

Implement or refactor Todo according to the System Design and approved refactor plan.

### Tasks

1. Hide or remove non-Todo active UI paths.
2. Refactor Todo domain logic if needed.
3. Refactor Todo UI components if needed.
4. Implement redesigned UI after Claude Design review.
5. Implement empty states.
6. Implement error states.
7. Implement validation.
8. Implement persistence improvements.
9. Add or improve tests.
10. Update documentation after each behavior change.

### Output Artifacts

```text
Code changes
Tests
Updated README / ARCHITECTURE / AI.md if needed
Implementation notes
```

### Acceptance Criteria

```text
- Todo core flows work.
- Non-Todo modules are not active in UI.
- Domain/UI boundaries are clearer than before.
- Tests cover critical behavior.
- Quality gates pass or failures are documented.
```

### Claude Prompt

```text
Goal:
Implement the next approved Todo refactor or feature slice.

Context:
Implementation must follow the System Design, AI.md, ADRs, and refactor plan.

Constraints:
Work on one slice only. Do not introduce new modules. Do not rewrite unrelated code. Update tests and docs when behavior changes.

Expected output:
Make code changes for the approved slice, add/update tests, and summarize verification results.

Definition of done:
The slice is implemented, tested, documented, and does not expand scope beyond Todo.
```

---

## 11. Phase 8: Quality Gates and Production Readiness

### Goal

Make Todo reliable enough for real personal daily use.

### Tasks

1. Identify actual project quality commands.
2. Ensure typecheck passes.
3. Ensure lint passes.
4. Ensure tests pass.
5. Ensure build passes.
6. Review persistence risks.
7. Review deployment readiness.
8. Review authentication/access protection if deployed online.
9. Review backup/export strategy.
10. Create production readiness checklist.

### Output Artifacts

```text
docs/production/production-readiness-checklist.md
docs/production/verification-report.md
```

### Acceptance Criteria

```text
- Quality commands are documented.
- Verification report exists.
- Production readiness checklist exists.
- Known risks are documented.
- Critical blockers are identified.
```

### Claude Prompt

```text
Goal:
Evaluate Todo Hub v1 production readiness.

Context:
The app is for one user but should be reliable enough for real daily use.

Constraints:
Do not add unrelated features. Focus on reliability, data safety, deployment readiness, and verification.

Expected output:
Create production-readiness-checklist.md and verification-report.md. Run available quality gates and document results.

Definition of done:
Anton can see what is ready, what is risky, and what must be fixed before using the app daily.
```

---

## 12. Phase 9: GitHub Wiki Documentation

### Goal

Prepare user-facing and learning-facing documentation for GitHub Wiki.

### Tasks

1. Create wiki page drafts in repo first.
2. Draft Home page.
3. Draft User Guide.
4. Draft Daily Todo Workflow.
5. Draft Task Lifecycle.
6. Draft FAQ.
7. Draft Design Principles.
8. Draft System Design Learning Notes.
9. Draft Retrospectives index.
10. Move or copy approved content to GitHub Wiki.

### Output Artifacts

```text
docs/wiki/Home.md
docs/wiki/User-Guide.md
docs/wiki/Daily-Todo-Workflow.md
docs/wiki/Task-Lifecycle.md
docs/wiki/FAQ.md
docs/wiki/Design-Principles.md
docs/wiki/System-Design-Learning-Notes.md
docs/wiki/Retrospectives.md
```

### Acceptance Criteria

```text
- Wiki drafts exist.
- User documentation is understandable without reading code.
- Learning documentation explains the rebuild process.
- GitHub Wiki can be populated from the drafts.
```

### Claude Prompt

```text
Goal:
Create GitHub Wiki documentation drafts for Todo Hub v1.

Context:
The GitHub Wiki will contain user-facing documentation and learning notes. Repo docs remain for developers and AI agents.

Constraints:
Do not duplicate all internal architecture docs into the Wiki. Keep user docs simple and readable.

Expected output:
Create docs/wiki page drafts for Home, User Guide, Daily Todo Workflow, Task Lifecycle, FAQ, Design Principles, System Design Learning Notes, and Retrospectives.

Definition of done:
The drafts can be copied into GitHub Wiki with minimal editing.
```

---

## 13. Phase 10: Retrospective and Learning Summary

### Goal

Turn the rebuild into explicit learning material.

### Tasks

1. Create stage retrospective.
2. Document assumptions.
3. Document mistakes.
4. Document trade-offs.
5. Document what changed after review.
6. Document what Anton learned about System Design.
7. Document what Anton learned about AI-assisted development.
8. Document what should be done differently next time.

### Output Artifacts

```text
docs/learning-log/YYYY-MM-DD-todo-ai-first-rebuild-retrospective.md
```

### Acceptance Criteria

```text
- Retrospective exists.
- Mistakes are documented honestly.
- Learning outcomes are explicit.
- Next steps are defined.
```

### Claude Prompt

```text
Goal:
Create a learning retrospective for the Todo-only AI-first rebuild.

Context:
This is an educational project. Mistakes and redesigns are valuable if they are documented and understood.

Constraints:
Be honest. Do not present all decisions as perfect. Distinguish what worked, what failed, and what should change next time.

Expected output:
Create a retrospective in docs/learning-log with assumptions, mistakes, trade-offs, lessons, and next steps.

Definition of done:
The retrospective can be shown to a mentor as evidence of engineering learning, not only feature delivery.
```

---

## 14. Suggested Work Order for First Three Sessions

### Session 1

```text
Phase 0: Preparation
Phase 1: Scope Freeze
```

Expected result:

```text
Repo map
AI.md
Initial ADRs
README update
```

### Session 2

```text
Phase 2: Current State Audit
```

Expected result:

```text
Audit documents
Problems list
Keep/remove/defer decisions
Technical debt list
```

### Session 3

```text
Phase 3: System Design
```

Expected result:

```text
Todo v1 System Design
Domain model
Data model
Frontend architecture
Deployment model
```

Do not start UI redesign before Session 3 is complete.

---

## 15. Quality Checklist for Claude After Each Phase

Claude should answer these questions after every phase:

```text
1. Did I respect Todo-only scope?
2. Did I avoid adding new modules?
3. Did I update or create the required artifacts?
4. Did I document trade-offs?
5. Did I avoid destructive changes without a plan?
6. Did I preserve learning value?
7. Did I identify risks?
8. Did I define the next step?
```

---

## 16. Final Completion Criteria

The full plan is complete when:

```text
- Todo is the only active module.
- System Design exists and was used.
- AI-first repository rules exist.
- Claude Design brief exists and was used or is ready to use.
- Todo implementation follows the approved architecture direction.
- Core flows work.
- Quality gates are documented and executed.
- GitHub Wiki drafts exist.
- Retrospective exists.
- The project can be explained as a learning-focused System Design and AI-assisted engineering case study.
```

---

## 17. Task Tracker and Session Workflow

This plan is the methodology. The **canonical list of pending work** lives in [`rebuild/TASKS.md`](TASKS.md). Cold-start instructions for AI agents live in [`rebuild/AGENT.md`](AGENT.md).

### 17.1 Task Granularity

Each phase is decomposed into PR-sized tasks in `rebuild/TASKS.md`. The mapping is roughly:

| Phase | Approx PRs |
|---|---|
| 0 Preparation | 2 |
| 1 Scope Freeze | 5 |
| 2 Audit | 4 |
| 3 System Design | 6 |
| 4 AI-First Structure | 5 |
| 5 Claude Design Prep | 2 |
| 6 Refactor Plan | 1 |
| 7 Todo Implementation | TBD (defined by Phase 6 output) |
| 8 Quality Gates | 4 |
| 9 Wiki Drafts | 8 |
| 10 Retrospective | 1 |

Phase 7 sub-tasks are added to `TASKS.md` only after Phase 6 lands its refactor plan.

### 17.2 Per-Chat Workflow

The user runs each task in a fresh chat. The agent must:

1. Read `rebuild/AGENT.md` first.
2. Open `rebuild/TASKS.md`, find the **first unchecked** task.
3. Read the referenced phase section in this plan plus `§15` of the spec (binding decisions).
4. Plan the PR (files, acceptance, verification).
5. Execute exactly that one task — no scope creep, no merging tasks.
6. Update `rebuild/TASKS.md`: tick the box, append PR URL and date.
7. **Stop.** Do not pick up the next task. Wait for human review.

### 17.3 Updating TASKS.md

Format for completed tasks:

```text
- [x] **1.2** Create ADR-0001 (Todo-only scope)
      PR: https://github.com/anton415/anton415-hub/pull/NNN  •  merged 2026-05-19
```

If a task is open as a PR but not yet merged:

```text
- [~] **1.2** Create ADR-0001 (Todo-only scope)
      PR: https://github.com/anton415/anton415-hub/pull/NNN  •  open
```

### 17.4 Adding New Tasks

If during execution the agent discovers that a task in `TASKS.md` is too large or missing a prerequisite:

- Do **not** silently expand the current task.
- Stop, propose the split or prerequisite to the user, and let the user approve the addition to `TASKS.md` before continuing.

### 17.5 When the Plan and TASKS.md Disagree

`TASKS.md` is the operational checklist. This plan is the methodology. If `TASKS.md` is missing a task that this plan calls for, treat it as an oversight and propose adding it. If `TASKS.md` has a task that this plan does not describe, ask before executing.
