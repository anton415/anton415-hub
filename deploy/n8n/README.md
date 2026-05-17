# n8n Workflows

This directory stores n8n workflow JSON files that are versioned with the Hub codebase.

## Orchestrator MVP Workflow

Workflow file:

```text
deploy/n8n/workflows/orchestrator-ai-feature-delivery-v0.json
```

Import it into the local n8n database:

```bash
make n8n-import-orchestrator
```

n8n imports workflows as inactive by default. After import, start the n8n UI with `make n8n`, open `http://localhost:5678`, review the workflow named `orchestrator-ai-feature-delivery-v0`, and activate it so Hub can call the production webhook URLs:

```text
POST /webhook/orchestrator-feature-intake
POST /webhook/orchestrator-approval
```

Required runtime variables for the n8n service:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `ORCHESTRATOR_GITHUB_TOKEN` or `GITHUB_TOKEN`
- `ORCHESTRATOR_HUB_API_BASE_URL`
- `ORCHESTRATOR_N8N_CALLBACK_TOKEN`
- `N8N_ENCRYPTION_KEY`
- `N8N_POSTGRES_PASSWORD`
- `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`

The workflow intentionally reads secrets from environment variables and does not store API keys or tokens inside the exported JSON.
For n8n 2.x this requires `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`; otherwise Code nodes cannot read `$env` and webhook executions fail before the AI call starts.

Production deploys copy this workflow from the app image into `/opt/anton415-hub/n8n/workflows`, import it into n8n, set it active, publish the current version, and restart n8n so webhook changes take effect.

## Flow

The workflow has two webhook triggers:

- `orchestrator-feature-intake`: generates a ChatGPT spec, writes `docs/specs/{feature_id}.md` to GitHub, and reports `spec_generated` to Hub.
- `orchestrator-approval`: receives Hub approvals. Spec approval generates Claude architecture and writes `docs/architecture/{feature_id}.md`; architecture approval creates the Codex prompt, opens a GitHub issue, and reports `ready_for_implementation`.

Hub remains the durable state machine. n8n does not keep a paused execution between approvals; it uses Hub's approval webhook payload to continue the next stage.
