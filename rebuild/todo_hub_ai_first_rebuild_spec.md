# Todo Hub AI-First Rebuild Specification

## 1. Purpose

This document defines the specification for a serious rebuild of `anton415-hub` / `anton415-os` into a focused, Todo-only, AI-first learning project.

The project must be treated as an educational engineering system, not only as a feature delivery task. The goal is to learn and practice System Design, AI-assisted development, architecture documentation, UI/UX redesign, production readiness, and controlled refactoring.

The main product outcome is a high-quality personal Todo application for one user.

The main learning outcome is a documented, reviewable, step-by-step engineering process that can be shown to a mentor or used as portfolio evidence.

---

## 2. Strategic Direction

### 2.1 Core Decision

The hub must be reduced to one active module:

```text
Active module: Todo
Frozen modules: Calendar, Finance, News, Orchestrator, Archive, Career, and any other future modules
```

No new module may be introduced until Todo reaches the defined readiness criteria.

### 2.2 Product Goal

Create a production-like Todo Hub for one user that is:

- simple;
- reliable;
- mobile-friendly;
- understandable for the user;
- easy for AI agents to navigate;
- documented in GitHub Wiki;
- supported by clear architecture and System Design documents;
- implemented through small, reviewable iterations.

### 2.3 Learning Goal

Use the rebuild to practice:

- System Design;
- requirements analysis;
- architecture trade-off analysis;
- ADR writing;
- UI/UX design handoff;
- Claude Design workflow;
- AI-first repository organization;
- Codex / Claude implementation planning;
- quality gates;
- retrospectives and engineering learning logs.

---

## 3. Non-Negotiable Constraints

The following constraints must be respected during all stages.

### 3.1 Todo-Only Scope

The project must not implement new modules before Todo is production-ready.

Out of scope for Todo v1:

- Calendar module;
- Finance module;
- News module;
- Orchestrator module;
- AI chat module;
- multi-user collaboration;
- public user registration;
- team task management;
- complex analytics dashboards;
- gamification;
- social features;
- microservice decomposition.

### 3.2 AI-First Codebase

The codebase must be optimized for AI-assisted work.

This means:

- predictable repository structure;
- small files with narrow responsibility;
- explicit boundaries between domain, UI, API, persistence, and infrastructure;
- clear naming;
- minimal hidden behavior;
- explicit validation schemas;
- machine-readable contracts where useful;
- tests for behavior;
- documentation colocated with architectural decisions;
- prompts stored in the repository;
- AI agents guided by `AI.md`.

AI-first does not mean unreadable code for humans. Human review remains required.

### 3.3 Documentation Split

Repository documentation and GitHub Wiki documentation have different roles.

Repository documentation is for developers and AI agents:

```text
README.md
AI.md
ARCHITECTURE.md
docs/system-design/*
docs/adr/*
docs/audit/*
docs/prompts/*
docs/learning-log/*
```

GitHub Wiki is for user-facing and learning-facing documentation:

```text
User Guide
Daily Workflow
Task Lifecycle
FAQ
Design Principles
System Design Learning Notes
Retrospectives
```

### 3.4 System Design Before Major Rebuild

Major implementation work must not start before a System Design stage is completed.

The System Design does not need to be perfect. It must be explicit, reviewable, and good enough to guide implementation.

### 3.5 Design Before UI Implementation

UI implementation must be based on a design brief and design review.

Claude Design may be used for:

- visual direction;
- wireframes;
- screen layouts;
- design system;
- component inventory;
- empty states;
- error states;
- mobile layout.

Claude Design must not expand the product scope beyond Todo v1.

---

## 4. Target Product: Todo Hub v1

### 4.1 User Model

The application is for one user only: Anton.

There is no team, organization, public registration, or shared workspace in Todo v1.

### 4.2 Functional Requirements

Todo Hub v1 should allow the user to:

1. Create a task.
2. Edit a task.
3. Mark a task as completed.
4. Delete or archive a task.
5. View active tasks.
6. View completed or archived tasks.
7. Assign priority to a task.
8. Assign status to a task.
9. Use the app comfortably on desktop.
10. Use the app comfortably on mobile.
11. Persist data safely.
12. Recover from common user mistakes where reasonable.
13. Understand what is important today.

Optional for later v1.x, not mandatory for first v1:

- tags;
- due dates;
- recurring tasks;
- task notes;
- search;
- export;
- backup screen;
- keyboard shortcuts.

### 4.3 Non-Functional Requirements

Todo Hub v1 should prioritize:

- reliability over feature count;
- clarity over visual complexity;
- low stress over engagement tricks;
- maintainability over clever code;
- explicit architecture over implicit convenience;
- stable daily use over experimental features.

### 4.4 Readiness Criteria

Todo may be considered production-like only when all mandatory criteria are met:

```text
- Todo is the only active module.
- The app can be used for 14 consecutive days without critical data loss.
- Data persistence is reliable.
- Basic authentication or access protection exists if deployed online.
- Mobile layout is usable.
- Core Todo flows are tested.
- Typecheck passes.
- Lint passes.
- Build passes.
- Basic error states exist.
- Basic empty states exist.
- README is current.
- AI.md exists and is current.
- System Design document exists.
- Key ADRs exist.
- GitHub Wiki contains user documentation.
- There is at least one retrospective describing what was learned.
```

---

## 5. Required Repository Structure

The exact structure may be adjusted after audit, but the target direction is:

```text
repo-root/
  README.md
  AI.md
  ARCHITECTURE.md
  CONTRIBUTING.md

  docs/
    audit/
      current-state.md
      problems.md
      keep-remove-defer.md
      technical-debt.md

    system-design/
      todo-v1-system-design.md
      domain-model.md
      data-model.md
      api-contract.md
      frontend-architecture.md
      deployment-model.md

    adr/
      0001-focus-on-todo-only.md
      0002-ai-first-repository-structure.md
      0003-github-wiki-for-user-docs.md
      0004-system-design-before-rebuild.md

    prompts/
      claude-design-brief.md
      codex-implementation-prompt.md
      ai-review-prompt.md

    learning-log/
      YYYY-MM-DD-stage-retrospective.md

  apps/
    web/

  packages/
    domain/
    ui/
    config/

  server/ or backend/
    src/
```

If the current repository structure differs significantly, Claude must first propose a migration path instead of performing a destructive rewrite.

---

## 6. Required Documents

### 6.1 AI.md

`AI.md` must be created at repository root.

It must explain:

- project goal;
- current priority;
- active scope;
- frozen scope;
- architecture rules;
- coding rules;
- testing rules;
- documentation rules;
- forbidden actions;
- quality gates.

Minimum content:

```md
# AI Working Rules

## Project Goal

This repository is a personal Todo Hub for one user.

## Current Priority

Only the Todo module is active.

## Frozen Modules

Do not implement Calendar, Finance, News, Orchestrator, Archive, Career, or other modules.

## Architecture Rules

- Keep domain logic separate from UI.
- Keep persistence concerns separate from domain logic.
- Prefer small files.
- Prefer explicit contracts.
- Do not introduce new frameworks without ADR.
- Do not perform large rewrites without a migration plan.

## Quality Gates

Before completing an implementation task, run:

- typecheck;
- lint;
- tests;
- build.
```

### 6.2 System Design Document

Create:

```text
docs/system-design/todo-v1-system-design.md
```

Required sections:

```text
1. Context
2. Goals
3. Non-goals
4. User and usage model
5. Functional requirements
6. Non-functional requirements
7. Domain model
8. Data model
9. API design
10. Frontend architecture
11. Backend architecture
12. Security model
13. Deployment model
14. Observability
15. AI-first architecture rules
16. Trade-offs
17. Rejected alternatives
18. Open questions
19. Acceptance criteria
```

### 6.3 ADRs

At minimum, create these ADRs:

```text
docs/adr/0001-focus-on-todo-only.md
docs/adr/0002-ai-first-repository-structure.md
docs/adr/0003-github-wiki-for-user-docs.md
docs/adr/0004-system-design-before-rebuild.md
```

Each ADR must include:

```text
Status
Context
Decision
Consequences
Alternatives considered
```

### 6.4 Audit Documents

Create:

```text
docs/audit/current-state.md
docs/audit/problems.md
docs/audit/keep-remove-defer.md
docs/audit/technical-debt.md
```

The audit must answer:

- what currently works;
- what is broken;
- what should be kept;
- what should be removed;
- what should be deferred;
- what creates risk;
- what blocks AI-first development.

### 6.5 Claude Design Brief

Create:

```text
docs/prompts/claude-design-brief.md
```

It must include:

- product context;
- user profile;
- design goals;
- design constraints;
- required screens;
- component inventory;
- mobile requirements;
- empty states;
- error states;
- deliverables expected from Claude Design.

### 6.6 GitHub Wiki Plan

Create a wiki plan, either in repo docs first or directly in GitHub Wiki.

Suggested pages:

```text
Home
User Guide
Daily Todo Workflow
Task Lifecycle
FAQ
Design Principles
System Design Learning Notes
Retrospectives
```

---

## 7. Claude Work Rules

Claude must follow these rules when working on the project.

### 7.1 Always Preserve Learning Value

This is a learning project. Claude must not silently hide complexity or replace learning with fully automated decisions.

Claude should explain architectural choices, trade-offs, and consequences in documents.

### 7.2 Prefer Phased Work

Claude must avoid one-shot rewrites.

Preferred sequence:

```text
Audit -> System Design -> ADR -> Design Brief -> Refactor Plan -> Implementation -> Verification -> Wiki -> Retrospective
```

### 7.3 No Scope Expansion

Claude must not add features outside Todo v1 unless explicitly requested.

### 7.4 No Destructive Refactor Without Plan

Before deleting or moving large parts of code, Claude must produce:

```text
- affected files;
- reason for change;
- migration steps;
- risk;
- rollback strategy;
- verification commands.
```

### 7.5 Every Stage Must Produce Artifacts

Each stage should leave reviewable artifacts in the repository.

Examples:

```text
System Design document
ADR
Prompt file
Refactor plan
Test plan
Retrospective
```

---

## 8. Implementation Principles

### 8.1 Architecture

Prefer simple modular architecture over microservices.

Microservices are explicitly out of scope for Todo v1.

The architecture should support future modules conceptually but must not implement them now.

### 8.2 Domain Logic

Domain logic should not be mixed with UI rendering.

Todo domain concepts should be explicit:

```text
Task
TaskId
TaskStatus
TaskPriority
TaskTitle
TaskDescription
TaskDates
TaskLifecycle
```

### 8.3 UI

UI must be calm, clear, and low-noise.

Avoid:

- overloaded dashboards;
- gamification;
- excessive animations;
- distracting colors;
- too many panels;
- fake productivity metrics.

Prefer:

- clear Today view;
- fast task capture;
- readable task list;
- explicit empty states;
- mobile-first usability;
- simple navigation.

### 8.4 Testing

Testing must focus on critical behavior:

```text
- task creation;
- task editing;
- task completion;
- task deletion/archive;
- persistence behavior;
- validation;
- rendering of empty states;
- error handling.
```

### 8.5 Quality Gates

Before implementation work is considered complete, run available project checks.

Expected checks may include:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

If exact commands differ, Claude must discover and document the actual commands.

---

## 9. Acceptance Criteria for the Full Rebuild

The rebuild is complete only when:

```text
- Todo is the only active module in the UI and code path.
- Frozen modules are documented as deferred.
- System Design is complete and reviewed.
- Key ADRs exist.
- AI.md exists and is followed.
- Claude Design brief exists.
- UI redesign is implemented or prepared for implementation.
- Core Todo flows work.
- Quality gates pass.
- GitHub Wiki structure is prepared.
- User guide exists.
- Learning retrospective exists.
- Project can be explained to a mentor as a System Design and AI-assisted development exercise.
```

---

## 10. Definition of Done for Each Stage

Each stage is done only when it has:

```text
- clear output artifacts;
- explicit acceptance criteria;
- review notes;
- risks documented;
- next step identified.
```

No stage should end with only code changes and no explanation.

---

## 11. Main Risk Register

| Risk | Description | Mitigation |
|---|---|---|
| Scope creep | Adding Calendar, Finance, News, or AI modules too early | Todo-only ADR and AI.md rules |
| Rewrite trap | Rewriting everything without learning value | Audit and phased migration |
| Design-first chaos | Making UI before requirements and architecture | System Design before Claude Design |
| AI hallucination | AI creates features or structure not aligned with goals | AI.md, ADRs, specs, review prompts |
| Documentation rot | Docs become outdated | Update docs as part of Definition of Done |
| Overengineering | Applying enterprise patterns to single-user app | Explicit non-goals and trade-offs |
| Underengineering | Treating project as toy app with no quality gates | CI, tests, architecture docs |

---

## 12. Prompt Formula for Future Work

When asking Claude, Codex, or ChatGPT to perform a task, use this structure:

```text
Goal:
Context:
Current state:
Constraints:
Files to inspect:
Expected output:
Forbidden actions:
Quality gates:
Definition of done:
```

For large tasks, always ask first for a plan, then execute one stage at a time.

---

## 13. Recommended First Commit

The first commit of this rebuild should be documentation-only.

Suggested commit message:

```text
docs: define Todo-only AI-first rebuild strategy
```

Suggested files:

```text
AI.md
docs/adr/0001-focus-on-todo-only.md
docs/adr/0002-ai-first-repository-structure.md
docs/adr/0003-github-wiki-for-user-docs.md
docs/adr/0004-system-design-before-rebuild.md
docs/audit/current-state.md
docs/audit/problems.md
docs/audit/keep-remove-defer.md
docs/system-design/todo-v1-system-design.md
docs/prompts/claude-design-brief.md
```

---

## 14. Final Principle

The project must optimize for depth before breadth.

A single well-designed Todo module with clear System Design, AI-first structure, quality gates, and good documentation is more valuable for learning than many unfinished modules.

---

## 15. Project-Specific Decisions (anton415-hub)

This section captures binding decisions made on 2026-05-19 for this specific repository. Where this section conflicts with earlier generic sections of the spec, **this section wins**. The earlier sections describe the generic template; §15 is the concrete adaptation for `anton415-hub`.

### 15.1 Active Scope

| Module | Status |
|---|---|
| Todo | **Active** (the only one) |
| Finance | **Frozen** — code removed, ADR documents reasoning, PostgreSQL migrations preserved in repo for potential restore |
| Calendar | **Frozen** — code removed |
| Orchestrator | **Frozen** — code removed |
| Investments | **Frozen** — was placeholder, removed entirely |
| FIRE | **Frozen** — was placeholder, removed entirely |
| News | Never started — out of scope |
| AI chat | Never started — out of scope |

Removal happens in Phase 7 only, after Phase 6 produces an explicit refactor plan with rollback strategy. Phase 1 (Scope Freeze) is documentation-only.

### 15.2 Backend

- Stays on **Go** (`go.mod` preserved).
- `apps/api/` → moves to `server/` in Phase 7 per Phase 6 migration plan.
- Quality gates: `go test ./...`, `go vet ./...`, `go build ./...`, `golangci-lint run`.
- Yandex ID auth and PostgreSQL persistence are kept — they already serve production at `anton415.ru`.

### 15.3 Frontend

- Target monorepo layout: `packages/domain`, `packages/ui`, `packages/config`, `apps/web`.
- Migration from current `apps/web/src/modules/*` happens in Phase 7 per Phase 6 plan.
- Stack stays Vite + React + TypeScript + Tailwind v4. No framework change.
- Quality gates (once packages migration lands): `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

### 15.4 Documentation Lifecycle

- **Phase 0** captures a snapshot of current docs in `docs/audit/repo-map.md`.
- **Phase 1** deletes superseded documentation:
  - `ANALYSIS.md`, `PLAN.md`, `CHANGELOG.md`
  - `docs/specs/`, `docs/design/`, `docs/modules/`
  - `docs/architecture.md`, `docs/dev-setup.md`, `docs/roadmap.md`, `docs/migration.md`, `docs/production.md`, `docs/doc-inventory.md`, `docs/dependency-updates.md`, `docs/github-actions.md`, `docs/github-feature-ritual.md`, `docs/yandex-cost-estimate.md`
- New docs are created fresh in phases 1–9 per the structure defined in §5 of this spec.
- Repo Wiki (GitHub) is populated only in Phase 9 from `docs/wiki/` drafts.

### 15.5 Production Safety

- `anton415.ru` is live. After each PR until the backend refactor (Phase 7 sub-tasks), production must continue to function.
- Migrations for removed modules are kept in `migrations/` (do not drop in destructive order). A separate ADR documents the chosen path: keep tables, or `DROP` with a backup.
- Any PR that touches `deploy/`, `migrations/`, or CI requires explicit user approval before merging.

### 15.6 Work Granularity

- **One task in `rebuild/TASKS.md` = one PR.** No batched PRs.
- Conventional commit prefix per [Phase 1.4 of plan](todo_hub_ai_first_rebuild_plan.md#212-prefer-small-pull-requests--commits): `docs:`, `refactor:`, `feat(todo):`, `test(todo):`, `chore:`.
- Each PR updates `rebuild/TASKS.md` to tick the box and record the PR URL.

### 15.7 Cold-Start Entry Point

Fresh AI chat sessions start from `rebuild/AGENT.md`. That file links to this spec, the plan, and `rebuild/TASKS.md` (the working checklist).
