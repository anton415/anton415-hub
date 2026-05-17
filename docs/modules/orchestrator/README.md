# Orchestrator Module

The orchestrator module provides a controlled AI-assisted engineering workflow for connected GitHub repositories.

It helps transform feature ideas into:

- system specifications;
- architecture plans;
- implementation prompts;
- GitHub issues;
- pull request tracking;
- AI review artifacts;
- human approval history.

The module uses:

- ChatGPT for system analysis;
- Claude for architecture planning;
- Codex for implementation and code review;
- n8n for workflow orchestration;
- GitHub as the source of truth;
- anton415-hub UI for visibility and approval gates.

## Non-Goals

The orchestrator is not:

- a replacement for GitHub;
- a replacement for n8n;
- a replacement for Codex;
- a CI/CD system;
- an auto-merge bot;
- a fully autonomous developer.

## Ownership

- ChatGPT owns system analysis.
- Claude owns architecture.
- Codex owns implementation.
- Anton owns approvals.
- GitHub owns artifacts.
- n8n owns workflow transitions.
- Hub owns visibility.

## MVP Flow

```text
GitHub repo
  -> feature idea
  -> ChatGPT spec
  -> Hub spec approval
  -> Claude architecture
  -> Hub architecture approval
  -> Codex prompt
  -> GitHub issue
  -> ready_for_implementation
```

In the MVP, Hub stores projects, workflows, steps, artifacts, approvals, and events. n8n owns AI calls and GitHub writes. Codex implementation, automatic PR creation, AI review gates, and auto-merge are intentionally outside MVP scope.

## Local n8n Contract

Hub starts n8n with:

- `ORCHESTRATOR_N8N_FEATURE_INTAKE_URL`
- `ORCHESTRATOR_N8N_APPROVAL_URL`
- `ORCHESTRATOR_N8N_OUTBOUND_TOKEN` for optional Hub -> n8n webhook authorization
- `ORCHESTRATOR_N8N_CALLBACK_TOKEN`

For local development, use `make orchestrator-dev` when testing the full Hub + n8n loop.

n8n calls Hub callbacks under `/api/v1/orchestrator/n8n/*` with:

```http
Authorization: Bearer <ORCHESTRATOR_N8N_CALLBACK_TOKEN>
```

The first n8n workflow is versioned in `deploy/n8n/workflows/orchestrator-ai-feature-delivery-v0.json`.

Import it with:

```bash
make n8n-import-orchestrator
```

n8n imports workflows as inactive by default. After import, start the n8n UI with `make n8n`, open n8n, review the workflow named `orchestrator-ai-feature-delivery-v0`, and activate it.

Production deploys import, activate, and publish this workflow automatically from the app image. Required production secrets live in Lockbox: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `ORCHESTRATOR_GITHUB_TOKEN`, `ORCHESTRATOR_N8N_CALLBACK_TOKEN`, `N8N_ENCRYPTION_KEY`, and `N8N_POSTGRES_PASSWORD`. The n8n service also sets `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` because the MVP workflow reads these runtime values via `$env` inside Code nodes.

The workflow uses two production webhook paths:

- `/webhook/orchestrator-feature-intake`
- `/webhook/orchestrator-approval`

It follows:

```text
Webhook Trigger
  -> validate input
  -> generate ChatGPT spec
  -> create GitHub spec artifact
  -> call Hub spec_generated callback
  -> wait for Hub approval
  -> generate Claude architecture
  -> create GitHub architecture artifact
  -> call Hub architecture_generated callback
  -> wait for Hub approval
  -> generate Codex prompt
  -> create/update GitHub issue
  -> call Hub ready_for_implementation callback
```

Hub is the durable state machine: approvals start a new n8n webhook execution with workflow context and artifact previews from Hub, rather than keeping one long paused n8n execution open.
