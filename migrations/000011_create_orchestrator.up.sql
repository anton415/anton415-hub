CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE orchestrator_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    github_owner TEXT NOT NULL,
    github_repo TEXT NOT NULL,
    default_branch TEXT NOT NULL DEFAULT 'main',
    config_path TEXT NOT NULL DEFAULT '.ai/orchestrator.yaml',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT orchestrator_projects_repo_unique UNIQUE (github_owner, github_repo)
);

CREATE TABLE orchestrator_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES orchestrator_projects(id) ON DELETE CASCADE,
    feature_id TEXT NOT NULL,
    title TEXT NOT NULL,
    module TEXT,
    problem TEXT NOT NULL,
    status TEXT NOT NULL CHECK (
        status IN (
            'draft',
            'system_analysis_running',
            'spec_review',
            'spec_approved',
            'spec_changes_requested',
            'architecture_running',
            'architecture_review',
            'architecture_approved',
            'architecture_changes_requested',
            'ready_for_implementation',
            'implementation_running',
            'pr_review',
            'done',
            'failed',
            'rejected'
        )
    ),
    github_issue_url TEXT,
    github_pr_url TEXT,
    n8n_execution_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orchestrator_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES orchestrator_workflows(id) ON DELETE CASCADE,
    step_key TEXT NOT NULL,
    title TEXT NOT NULL,
    agent TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'done', 'failed', 'skipped')),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    error_message TEXT,
    CONSTRAINT orchestrator_steps_workflow_step_unique UNIQUE (workflow_id, step_key)
);

CREATE TABLE orchestrator_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES orchestrator_workflows(id) ON DELETE CASCADE,
    artifact_type TEXT NOT NULL CHECK (
        artifact_type IN (
            'spec',
            'spec_review',
            'architecture',
            'architecture_review',
            'codex_prompt',
            'pr_review',
            'decision_log'
        )
    ),
    title TEXT NOT NULL,
    github_url TEXT,
    local_preview TEXT,
    created_by_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orchestrator_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES orchestrator_workflows(id) ON DELETE CASCADE,
    step_key TEXT NOT NULL,
    decision TEXT NOT NULL CHECK (decision IN ('approved', 'changes_requested', 'rejected', 'approved_anyway')),
    comment TEXT,
    decided_by TEXT NOT NULL,
    decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orchestrator_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES orchestrator_workflows(id) ON DELETE CASCADE,
    source TEXT NOT NULL CHECK (source IN ('anton', 'n8n', 'github', 'system')),
    event_type TEXT NOT NULL,
    message TEXT NOT NULL,
    payload_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orchestrator_workflows_project_id ON orchestrator_workflows(project_id);
CREATE INDEX idx_orchestrator_workflows_status ON orchestrator_workflows(status);
CREATE INDEX idx_orchestrator_steps_workflow_id ON orchestrator_steps(workflow_id);
CREATE INDEX idx_orchestrator_artifacts_workflow_id ON orchestrator_artifacts(workflow_id);
CREATE INDEX idx_orchestrator_approvals_workflow_id ON orchestrator_approvals(workflow_id);
CREATE INDEX idx_orchestrator_events_workflow_id_created_at ON orchestrator_events(workflow_id, created_at DESC);
