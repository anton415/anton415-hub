package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/anton415/anton415-hub/internal/orchestrator/application"
	"github.com/anton415/anton415-hub/internal/orchestrator/domain"
)

const (
	foreignKeyViolation = "23503"
	uniqueViolation     = "23505"
)

type Repository struct {
	pool *pgxpool.Pool
	db   dbExecutor
}

type rowScanner interface {
	Scan(dest ...any) error
}

type dbExecutor interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool, db: pool}
}

func (repo *Repository) WithTx(ctx context.Context, fn func(application.Repository) error) error {
	tx, err := repo.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin orchestrator transaction: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	if err := fn(&Repository{pool: repo.pool, db: tx}); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit orchestrator transaction: %w", err)
	}
	return nil
}

func (repo *Repository) ListProjects(ctx context.Context) ([]domain.Project, error) {
	rows, err := repo.db.Query(ctx, `
		SELECT id::text, name, github_owner, github_repo, default_branch, config_path, status, created_at, updated_at
		FROM orchestrator_projects
		ORDER BY created_at DESC, id DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("list orchestrator projects: %w", err)
	}
	defer rows.Close()

	projects := []domain.Project{}
	for rows.Next() {
		project, err := scanProject(rows)
		if err != nil {
			return nil, err
		}
		projects = append(projects, project)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list orchestrator projects rows: %w", err)
	}
	return projects, nil
}

func (repo *Repository) GetProject(ctx context.Context, id string) (domain.Project, error) {
	project, err := scanProject(repo.db.QueryRow(ctx, `
		SELECT id::text, name, github_owner, github_repo, default_branch, config_path, status, created_at, updated_at
		FROM orchestrator_projects
		WHERE id::text = $1
	`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Project{}, application.ErrNotFound
	}
	if err != nil {
		return domain.Project{}, err
	}
	return project, nil
}

func (repo *Repository) CreateProject(ctx context.Context, project domain.Project) (domain.Project, error) {
	created, err := scanProject(repo.db.QueryRow(ctx, `
		INSERT INTO orchestrator_projects (name, github_owner, github_repo, default_branch, config_path, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id::text, name, github_owner, github_repo, default_branch, config_path, status, created_at, updated_at
	`, project.Name, project.GitHubOwner, project.GitHubRepo, project.DefaultBranch, project.ConfigPath, project.Status, project.CreatedAt, project.UpdatedAt))
	if isPostgresCode(err, uniqueViolation) {
		return domain.Project{}, domain.ErrInvalidRepository
	}
	if err != nil {
		return domain.Project{}, fmt.Errorf("create orchestrator project: %w", err)
	}
	return created, nil
}

func (repo *Repository) UpdateProject(ctx context.Context, project domain.Project) (domain.Project, error) {
	updated, err := scanProject(repo.db.QueryRow(ctx, `
		UPDATE orchestrator_projects
		SET name = $2,
		    github_owner = $3,
		    github_repo = $4,
		    default_branch = $5,
		    status = $6,
		    updated_at = $7
		WHERE id::text = $1
		RETURNING id::text, name, github_owner, github_repo, default_branch, config_path, status, created_at, updated_at
	`, project.ID, project.Name, project.GitHubOwner, project.GitHubRepo, project.DefaultBranch, project.Status, project.UpdatedAt))
	if isPostgresCode(err, uniqueViolation) {
		return domain.Project{}, domain.ErrInvalidRepository
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Project{}, application.ErrNotFound
	}
	if err != nil {
		return domain.Project{}, fmt.Errorf("update orchestrator project: %w", err)
	}
	return updated, nil
}

func (repo *Repository) DeleteProject(ctx context.Context, id string) error {
	tag, err := repo.db.Exec(ctx, `
		DELETE FROM orchestrator_projects
		WHERE id::text = $1
	`, id)
	if err != nil {
		return fmt.Errorf("delete orchestrator project: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return application.ErrNotFound
	}
	return nil
}

func (repo *Repository) ListWorkflows(ctx context.Context) ([]application.WorkflowSummary, error) {
	rows, err := repo.db.Query(ctx, `
		SELECT
			w.id::text, w.project_id::text, w.feature_id, w.title, w.module, w.problem, w.status, w.github_issue_url, w.github_pr_url, w.n8n_execution_id, w.created_at, w.updated_at,
			p.id::text, p.name, p.github_owner, p.github_repo, p.default_branch, p.config_path, p.status, p.created_at, p.updated_at,
			(SELECT count(*) FROM orchestrator_steps s WHERE s.workflow_id = w.id),
			(SELECT count(*) FROM orchestrator_artifacts a WHERE a.workflow_id = w.id),
			(SELECT count(*) FROM orchestrator_approvals ap WHERE ap.workflow_id = w.id),
			(SELECT count(*) FROM orchestrator_events e WHERE e.workflow_id = w.id)
		FROM orchestrator_workflows w
		JOIN orchestrator_projects p ON p.id = w.project_id
		ORDER BY w.updated_at DESC, w.created_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("list orchestrator workflows: %w", err)
	}
	defer rows.Close()

	workflows := []application.WorkflowSummary{}
	for rows.Next() {
		summary, err := scanWorkflowSummary(rows)
		if err != nil {
			return nil, err
		}
		workflows = append(workflows, summary)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list orchestrator workflows rows: %w", err)
	}
	return workflows, nil
}

func (repo *Repository) GetWorkflow(ctx context.Context, id string) (application.WorkflowDetail, error) {
	detail, err := repo.getWorkflowBase(ctx, repo.db, id)
	if err != nil {
		return application.WorkflowDetail{}, err
	}

	steps, err := repo.listSteps(ctx, id)
	if err != nil {
		return application.WorkflowDetail{}, err
	}
	artifacts, err := repo.listArtifacts(ctx, id)
	if err != nil {
		return application.WorkflowDetail{}, err
	}
	approvals, err := repo.listApprovals(ctx, id)
	if err != nil {
		return application.WorkflowDetail{}, err
	}
	events, err := repo.listEvents(ctx, id)
	if err != nil {
		return application.WorkflowDetail{}, err
	}

	detail.Steps = steps
	detail.Artifacts = artifacts
	detail.Approvals = approvals
	detail.Events = events
	return detail, nil
}

func (repo *Repository) CreateWorkflow(ctx context.Context, workflow domain.Workflow, steps []domain.Step, event domain.Event) (application.WorkflowDetail, error) {
	tx, err := repo.pool.Begin(ctx)
	if err != nil {
		return application.WorkflowDetail{}, fmt.Errorf("begin create orchestrator workflow: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	created, err := scanWorkflow(tx.QueryRow(ctx, `
		INSERT INTO orchestrator_workflows (
			project_id, feature_id, title, module, problem, status, github_issue_url, github_pr_url, n8n_execution_id, created_at, updated_at
		)
		SELECT id, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
		FROM orchestrator_projects
		WHERE id::text = $1
		RETURNING id::text, project_id::text, feature_id, title, module, problem, status, github_issue_url, github_pr_url, n8n_execution_id, created_at, updated_at
	`, workflow.ProjectID, workflow.FeatureID, workflow.Title, nullableString(workflow.Module), workflow.Problem, workflow.Status, nullableString(workflow.GitHubIssueURL), nullableString(workflow.GitHubPRURL), nullableString(workflow.N8NExecutionID), workflow.CreatedAt, workflow.UpdatedAt))
	if isPostgresCode(err, uniqueViolation) {
		return application.WorkflowDetail{}, domain.ErrDuplicateWorkflow
	}
	if isPostgresCode(err, foreignKeyViolation) || errors.Is(err, pgx.ErrNoRows) {
		return application.WorkflowDetail{}, application.ErrNotFound
	}
	if err != nil {
		return application.WorkflowDetail{}, fmt.Errorf("create orchestrator workflow: %w", err)
	}

	for _, step := range steps {
		step.WorkflowID = created.ID
		if _, err := insertStep(ctx, tx, step); err != nil {
			return application.WorkflowDetail{}, err
		}
	}

	event.WorkflowID = created.ID
	if _, err := insertEvent(ctx, tx, event); err != nil {
		return application.WorkflowDetail{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return application.WorkflowDetail{}, fmt.Errorf("commit create orchestrator workflow: %w", err)
	}

	return repo.GetWorkflow(ctx, created.ID)
}

func (repo *Repository) UpdateWorkflowStatus(ctx context.Context, id string, status domain.WorkflowStatus, now time.Time) (domain.Workflow, error) {
	workflow, err := scanWorkflow(repo.db.QueryRow(ctx, `
		UPDATE orchestrator_workflows
		SET status = $2,
		    updated_at = $3
		WHERE id::text = $1
		RETURNING id::text, project_id::text, feature_id, title, module, problem, status, github_issue_url, github_pr_url, n8n_execution_id, created_at, updated_at
	`, id, status, now))
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Workflow{}, application.ErrNotFound
	}
	if err != nil {
		return domain.Workflow{}, fmt.Errorf("update orchestrator workflow status: %w", err)
	}
	return workflow, nil
}

func (repo *Repository) UpdateWorkflowLinks(ctx context.Context, id string, githubIssueURL *string, githubPRURL *string, n8nExecutionID *string, now time.Time) (domain.Workflow, error) {
	workflow, err := scanWorkflow(repo.db.QueryRow(ctx, `
		UPDATE orchestrator_workflows
		SET github_issue_url = COALESCE($2, github_issue_url),
		    github_pr_url = COALESCE($3, github_pr_url),
		    n8n_execution_id = COALESCE($4, n8n_execution_id),
		    updated_at = $5
		WHERE id::text = $1
		RETURNING id::text, project_id::text, feature_id, title, module, problem, status, github_issue_url, github_pr_url, n8n_execution_id, created_at, updated_at
	`, id, nullableString(githubIssueURL), nullableString(githubPRURL), nullableString(n8nExecutionID), now))
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Workflow{}, application.ErrNotFound
	}
	if err != nil {
		return domain.Workflow{}, fmt.Errorf("update orchestrator workflow links: %w", err)
	}
	return workflow, nil
}

func (repo *Repository) UpdateStep(ctx context.Context, workflowID string, stepKey domain.StepKey, status domain.StepStatus, errorMessage *string, now time.Time) error {
	tag, err := repo.db.Exec(ctx, `
		UPDATE orchestrator_steps
		SET status = $3,
		    started_at = CASE
		        WHEN started_at IS NULL AND $3 IN ('running', 'done', 'failed') THEN $5
		        ELSE started_at
		    END,
		    finished_at = CASE
		        WHEN $3 IN ('done', 'failed', 'skipped') THEN $5
		        ELSE NULL
		    END,
		    error_message = $4
		WHERE workflow_id::text = $1
		  AND step_key = $2
	`, workflowID, stepKey, status, nullableString(errorMessage), now)
	if err != nil {
		return fmt.Errorf("update orchestrator step: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return application.ErrNotFound
	}
	return nil
}

func (repo *Repository) CreateArtifact(ctx context.Context, artifact domain.Artifact) (domain.Artifact, error) {
	created, err := insertArtifact(ctx, repo.db, artifact)
	if isPostgresCode(err, foreignKeyViolation) {
		return domain.Artifact{}, application.ErrNotFound
	}
	if err != nil {
		return domain.Artifact{}, err
	}
	return created, nil
}

func (repo *Repository) CreateApproval(ctx context.Context, approval domain.Approval) (domain.Approval, error) {
	created, err := insertApproval(ctx, repo.db, approval)
	if isPostgresCode(err, foreignKeyViolation) {
		return domain.Approval{}, application.ErrNotFound
	}
	if err != nil {
		return domain.Approval{}, err
	}
	return created, nil
}

func (repo *Repository) CreateEvent(ctx context.Context, event domain.Event) (domain.Event, error) {
	created, err := insertEvent(ctx, repo.db, event)
	if isPostgresCode(err, foreignKeyViolation) {
		return domain.Event{}, application.ErrNotFound
	}
	if err != nil {
		return domain.Event{}, err
	}
	return created, nil
}

type queryer interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

func insertStep(ctx context.Context, db queryer, step domain.Step) (domain.Step, error) {
	created, err := scanStep(db.QueryRow(ctx, `
		INSERT INTO orchestrator_steps (workflow_id, step_key, title, agent, status, started_at, finished_at, error_message)
		SELECT id, $2, $3, $4, $5, $6, $7, $8
		FROM orchestrator_workflows
		WHERE id::text = $1
		RETURNING id::text, workflow_id::text, step_key, title, agent, status, started_at, finished_at, error_message
	`, step.WorkflowID, step.StepKey, step.Title, nullableAgent(step.Agent), step.Status, nullableTime(step.StartedAt), nullableTime(step.FinishedAt), nullableString(step.ErrorMessage)))
	if isPostgresCode(err, foreignKeyViolation) || errors.Is(err, pgx.ErrNoRows) {
		return domain.Step{}, application.ErrNotFound
	}
	if err != nil {
		return domain.Step{}, fmt.Errorf("create orchestrator step: %w", err)
	}
	return created, nil
}

func insertArtifact(ctx context.Context, db queryer, artifact domain.Artifact) (domain.Artifact, error) {
	created, err := scanArtifact(db.QueryRow(ctx, `
		INSERT INTO orchestrator_artifacts (workflow_id, artifact_type, title, github_url, local_preview, created_by_agent, created_at)
		SELECT id, $2, $3, $4, $5, $6, $7
		FROM orchestrator_workflows
		WHERE id::text = $1
		RETURNING id::text, workflow_id::text, artifact_type, title, github_url, local_preview, created_by_agent, created_at
	`, artifact.WorkflowID, artifact.ArtifactType, artifact.Title, nullableString(artifact.GitHubURL), nullableString(artifact.LocalPreview), nullableAgent(artifact.CreatedByAgent), artifact.CreatedAt))
	if isPostgresCode(err, foreignKeyViolation) || errors.Is(err, pgx.ErrNoRows) {
		return domain.Artifact{}, application.ErrNotFound
	}
	if err != nil {
		return domain.Artifact{}, fmt.Errorf("create orchestrator artifact: %w", err)
	}
	return created, nil
}

func insertApproval(ctx context.Context, db queryer, approval domain.Approval) (domain.Approval, error) {
	created, err := scanApproval(db.QueryRow(ctx, `
		INSERT INTO orchestrator_approvals (workflow_id, step_key, decision, comment, decided_by, decided_at)
		SELECT id, $2, $3, $4, $5, $6
		FROM orchestrator_workflows
		WHERE id::text = $1
		RETURNING id::text, workflow_id::text, step_key, decision, comment, decided_by, decided_at
	`, approval.WorkflowID, approval.StepKey, approval.Decision, nullableString(approval.Comment), approval.DecidedBy, approval.DecidedAt))
	if isPostgresCode(err, foreignKeyViolation) || errors.Is(err, pgx.ErrNoRows) {
		return domain.Approval{}, application.ErrNotFound
	}
	if err != nil {
		return domain.Approval{}, fmt.Errorf("create orchestrator approval: %w", err)
	}
	return created, nil
}

func insertEvent(ctx context.Context, db queryer, event domain.Event) (domain.Event, error) {
	created, err := scanEvent(db.QueryRow(ctx, `
		INSERT INTO orchestrator_events (workflow_id, source, event_type, message, payload_json, created_at)
		SELECT id, $2, $3, $4, $5, $6
		FROM orchestrator_workflows
		WHERE id::text = $1
		RETURNING id::text, workflow_id::text, source, event_type, message, payload_json::text, created_at
	`, event.WorkflowID, event.Source, event.EventType, event.Message, nullableJSON(event.PayloadJSON), event.CreatedAt))
	if isPostgresCode(err, foreignKeyViolation) || errors.Is(err, pgx.ErrNoRows) {
		return domain.Event{}, application.ErrNotFound
	}
	if err != nil {
		return domain.Event{}, fmt.Errorf("create orchestrator event: %w", err)
	}
	return created, nil
}

func (repo *Repository) getWorkflowBase(ctx context.Context, db interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}, id string) (application.WorkflowDetail, error) {
	detail, err := scanWorkflowBase(db.QueryRow(ctx, `
		SELECT
			w.id::text, w.project_id::text, w.feature_id, w.title, w.module, w.problem, w.status, w.github_issue_url, w.github_pr_url, w.n8n_execution_id, w.created_at, w.updated_at,
			p.id::text, p.name, p.github_owner, p.github_repo, p.default_branch, p.config_path, p.status, p.created_at, p.updated_at
		FROM orchestrator_workflows w
		JOIN orchestrator_projects p ON p.id = w.project_id
		WHERE w.id::text = $1
	`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return application.WorkflowDetail{}, application.ErrNotFound
	}
	if err != nil {
		return application.WorkflowDetail{}, err
	}
	return detail, nil
}

func (repo *Repository) listSteps(ctx context.Context, workflowID string) ([]domain.Step, error) {
	rows, err := repo.db.Query(ctx, `
		SELECT id::text, workflow_id::text, step_key, title, agent, status, started_at, finished_at, error_message
		FROM orchestrator_steps
		WHERE workflow_id::text = $1
		ORDER BY
			CASE step_key
				WHEN 'idea_created' THEN 1
				WHEN 'system_analysis' THEN 2
				WHEN 'spec_approval' THEN 3
				WHEN 'architecture' THEN 4
				WHEN 'architecture_approval' THEN 5
				WHEN 'codex_prompt_generated' THEN 6
				WHEN 'ready_for_implementation' THEN 7
				WHEN 'pr_opened' THEN 8
				WHEN 'pr_review' THEN 9
				WHEN 'done' THEN 10
				ELSE 99
			END,
			id
	`, workflowID)
	if err != nil {
		return nil, fmt.Errorf("list orchestrator steps: %w", err)
	}
	defer rows.Close()

	steps := []domain.Step{}
	for rows.Next() {
		step, err := scanStep(rows)
		if err != nil {
			return nil, err
		}
		steps = append(steps, step)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list orchestrator steps rows: %w", err)
	}
	return steps, nil
}

func (repo *Repository) listArtifacts(ctx context.Context, workflowID string) ([]domain.Artifact, error) {
	rows, err := repo.db.Query(ctx, `
		SELECT id::text, workflow_id::text, artifact_type, title, github_url, local_preview, created_by_agent, created_at
		FROM orchestrator_artifacts
		WHERE workflow_id::text = $1
		ORDER BY created_at DESC, id DESC
	`, workflowID)
	if err != nil {
		return nil, fmt.Errorf("list orchestrator artifacts: %w", err)
	}
	defer rows.Close()

	artifacts := []domain.Artifact{}
	for rows.Next() {
		artifact, err := scanArtifact(rows)
		if err != nil {
			return nil, err
		}
		artifacts = append(artifacts, artifact)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list orchestrator artifacts rows: %w", err)
	}
	return artifacts, nil
}

func (repo *Repository) listApprovals(ctx context.Context, workflowID string) ([]domain.Approval, error) {
	rows, err := repo.db.Query(ctx, `
		SELECT id::text, workflow_id::text, step_key, decision, comment, decided_by, decided_at
		FROM orchestrator_approvals
		WHERE workflow_id::text = $1
		ORDER BY decided_at DESC, id DESC
	`, workflowID)
	if err != nil {
		return nil, fmt.Errorf("list orchestrator approvals: %w", err)
	}
	defer rows.Close()

	approvals := []domain.Approval{}
	for rows.Next() {
		approval, err := scanApproval(rows)
		if err != nil {
			return nil, err
		}
		approvals = append(approvals, approval)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list orchestrator approvals rows: %w", err)
	}
	return approvals, nil
}

func (repo *Repository) listEvents(ctx context.Context, workflowID string) ([]domain.Event, error) {
	rows, err := repo.db.Query(ctx, `
		SELECT id::text, workflow_id::text, source, event_type, message, payload_json::text, created_at
		FROM orchestrator_events
		WHERE workflow_id::text = $1
		ORDER BY created_at DESC, id DESC
	`, workflowID)
	if err != nil {
		return nil, fmt.Errorf("list orchestrator events: %w", err)
	}
	defer rows.Close()

	events := []domain.Event{}
	for rows.Next() {
		event, err := scanEvent(rows)
		if err != nil {
			return nil, err
		}
		events = append(events, event)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list orchestrator events rows: %w", err)
	}
	return events, nil
}

func scanProject(row rowScanner) (domain.Project, error) {
	var project domain.Project
	var status string
	if err := row.Scan(&project.ID, &project.Name, &project.GitHubOwner, &project.GitHubRepo, &project.DefaultBranch, &project.ConfigPath, &status, &project.CreatedAt, &project.UpdatedAt); err != nil {
		return domain.Project{}, err
	}
	project.Status = domain.ProjectStatus(status)
	return project, nil
}

func scanWorkflow(row rowScanner) (domain.Workflow, error) {
	var workflow domain.Workflow
	var status string
	var module sql.NullString
	var issueURL sql.NullString
	var prURL sql.NullString
	var n8nExecutionID sql.NullString
	if err := row.Scan(&workflow.ID, &workflow.ProjectID, &workflow.FeatureID, &workflow.Title, &module, &workflow.Problem, &status, &issueURL, &prURL, &n8nExecutionID, &workflow.CreatedAt, &workflow.UpdatedAt); err != nil {
		return domain.Workflow{}, err
	}
	workflow.Status = domain.WorkflowStatus(status)
	workflow.Module = stringPtr(module)
	workflow.GitHubIssueURL = stringPtr(issueURL)
	workflow.GitHubPRURL = stringPtr(prURL)
	workflow.N8NExecutionID = stringPtr(n8nExecutionID)
	return workflow, nil
}

func scanWorkflowBase(row rowScanner) (application.WorkflowDetail, error) {
	var workflow domain.Workflow
	var project domain.Project
	var workflowStatus string
	var projectStatus string
	var module sql.NullString
	var issueURL sql.NullString
	var prURL sql.NullString
	var n8nExecutionID sql.NullString

	if err := row.Scan(
		&workflow.ID, &workflow.ProjectID, &workflow.FeatureID, &workflow.Title, &module, &workflow.Problem, &workflowStatus, &issueURL, &prURL, &n8nExecutionID, &workflow.CreatedAt, &workflow.UpdatedAt,
		&project.ID, &project.Name, &project.GitHubOwner, &project.GitHubRepo, &project.DefaultBranch, &project.ConfigPath, &projectStatus, &project.CreatedAt, &project.UpdatedAt,
	); err != nil {
		return application.WorkflowDetail{}, err
	}

	workflow.Status = domain.WorkflowStatus(workflowStatus)
	workflow.Module = stringPtr(module)
	workflow.GitHubIssueURL = stringPtr(issueURL)
	workflow.GitHubPRURL = stringPtr(prURL)
	workflow.N8NExecutionID = stringPtr(n8nExecutionID)
	project.Status = domain.ProjectStatus(projectStatus)
	return application.WorkflowDetail{
		Workflow: workflow,
		Project:  project,
	}, nil
}

func scanWorkflowSummary(row rowScanner) (application.WorkflowSummary, error) {
	var workflow domain.Workflow
	var project domain.Project
	var workflowStatus string
	var projectStatus string
	var module sql.NullString
	var issueURL sql.NullString
	var prURL sql.NullString
	var n8nExecutionID sql.NullString
	var summary application.WorkflowSummary
	var stepCount int64
	var artifactCount int64
	var approvalCount int64
	var eventCount int64

	if err := row.Scan(
		&workflow.ID, &workflow.ProjectID, &workflow.FeatureID, &workflow.Title, &module, &workflow.Problem, &workflowStatus, &issueURL, &prURL, &n8nExecutionID, &workflow.CreatedAt, &workflow.UpdatedAt,
		&project.ID, &project.Name, &project.GitHubOwner, &project.GitHubRepo, &project.DefaultBranch, &project.ConfigPath, &projectStatus, &project.CreatedAt, &project.UpdatedAt,
		&stepCount, &artifactCount, &approvalCount, &eventCount,
	); err != nil {
		return application.WorkflowSummary{}, err
	}

	workflow.Status = domain.WorkflowStatus(workflowStatus)
	workflow.Module = stringPtr(module)
	workflow.GitHubIssueURL = stringPtr(issueURL)
	workflow.GitHubPRURL = stringPtr(prURL)
	workflow.N8NExecutionID = stringPtr(n8nExecutionID)
	project.Status = domain.ProjectStatus(projectStatus)
	summary.Workflow = workflow
	summary.Project = project
	summary.StepCount = int(stepCount)
	summary.ArtifactCount = int(artifactCount)
	summary.ApprovalCount = int(approvalCount)
	summary.EventCount = int(eventCount)
	return summary, nil
}

func scanStep(row rowScanner) (domain.Step, error) {
	var step domain.Step
	var stepKey string
	var agent sql.NullString
	var status string
	var startedAt sql.NullTime
	var finishedAt sql.NullTime
	var errorMessage sql.NullString
	if err := row.Scan(&step.ID, &step.WorkflowID, &stepKey, &step.Title, &agent, &status, &startedAt, &finishedAt, &errorMessage); err != nil {
		return domain.Step{}, err
	}
	step.StepKey = domain.StepKey(stepKey)
	step.Agent = agentPtr(agent)
	step.Status = domain.StepStatus(status)
	step.StartedAt = timePtr(startedAt)
	step.FinishedAt = timePtr(finishedAt)
	step.ErrorMessage = stringPtr(errorMessage)
	return step, nil
}

func scanArtifact(row rowScanner) (domain.Artifact, error) {
	var artifact domain.Artifact
	var artifactType string
	var githubURL sql.NullString
	var localPreview sql.NullString
	var createdByAgent sql.NullString
	if err := row.Scan(&artifact.ID, &artifact.WorkflowID, &artifactType, &artifact.Title, &githubURL, &localPreview, &createdByAgent, &artifact.CreatedAt); err != nil {
		return domain.Artifact{}, err
	}
	artifact.ArtifactType = domain.ArtifactType(artifactType)
	artifact.GitHubURL = stringPtr(githubURL)
	artifact.LocalPreview = stringPtr(localPreview)
	artifact.CreatedByAgent = agentPtr(createdByAgent)
	return artifact, nil
}

func scanApproval(row rowScanner) (domain.Approval, error) {
	var approval domain.Approval
	var stepKey string
	var decision string
	var comment sql.NullString
	if err := row.Scan(&approval.ID, &approval.WorkflowID, &stepKey, &decision, &comment, &approval.DecidedBy, &approval.DecidedAt); err != nil {
		return domain.Approval{}, err
	}
	approval.StepKey = domain.StepKey(stepKey)
	approval.Decision = domain.ApprovalDecision(decision)
	approval.Comment = stringPtr(comment)
	return approval, nil
}

func scanEvent(row rowScanner) (domain.Event, error) {
	var event domain.Event
	var source string
	var payload sql.NullString
	if err := row.Scan(&event.ID, &event.WorkflowID, &source, &event.EventType, &event.Message, &payload, &event.CreatedAt); err != nil {
		return domain.Event{}, err
	}
	event.Source = domain.EventSource(source)
	if payload.Valid {
		event.PayloadJSON = json.RawMessage(payload.String)
	}
	return event, nil
}

func nullableString(value *string) any {
	if value == nil {
		return nil
	}
	return *value
}

func nullableAgent(value *domain.Agent) any {
	if value == nil {
		return nil
	}
	return string(*value)
}

func nullableTime(value *time.Time) any {
	if value == nil {
		return nil
	}
	return *value
}

func nullableJSON(value json.RawMessage) any {
	if len(value) == 0 {
		return nil
	}
	return string(value)
}

func stringPtr(value sql.NullString) *string {
	if !value.Valid {
		return nil
	}
	return &value.String
}

func timePtr(value sql.NullTime) *time.Time {
	if !value.Valid {
		return nil
	}
	return &value.Time
}

func agentPtr(value sql.NullString) *domain.Agent {
	if !value.Valid {
		return nil
	}
	agent := domain.Agent(value.String)
	return &agent
}

func isPostgresCode(err error, code string) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == code
}
