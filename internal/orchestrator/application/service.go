package application

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/anton415/anton415-hub/internal/orchestrator/domain"
)

type Repository interface {
	ListProjects(ctx context.Context) ([]domain.Project, error)
	GetProject(ctx context.Context, id string) (domain.Project, error)
	CreateProject(ctx context.Context, project domain.Project) (domain.Project, error)
	UpdateProject(ctx context.Context, project domain.Project) (domain.Project, error)
	DeleteProject(ctx context.Context, id string) error

	ListWorkflows(ctx context.Context) ([]WorkflowSummary, error)
	GetWorkflow(ctx context.Context, id string) (WorkflowDetail, error)
	CreateWorkflow(ctx context.Context, workflow domain.Workflow, steps []domain.Step, event domain.Event) (WorkflowDetail, error)
	UpdateWorkflowStatus(ctx context.Context, id string, status domain.WorkflowStatus, now time.Time) (domain.Workflow, error)
	UpdateWorkflowLinks(ctx context.Context, id string, githubIssueURL *string, githubPRURL *string, n8nExecutionID *string, now time.Time) (domain.Workflow, error)
	UpdateStep(ctx context.Context, workflowID string, stepKey domain.StepKey, status domain.StepStatus, errorMessage *string, now time.Time) error
	CreateArtifact(ctx context.Context, artifact domain.Artifact) (domain.Artifact, error)
	CreateApproval(ctx context.Context, approval domain.Approval) (domain.Approval, error)
	CreateEvent(ctx context.Context, event domain.Event) (domain.Event, error)
}

type N8NClient interface {
	StartFeatureWorkflow(ctx context.Context, payload FeatureIntakePayload) error
	NotifyApproval(ctx context.Context, payload ApprovalPayload) error
}

type Dependencies struct {
	Repository Repository
	N8N        N8NClient
	Now        func() time.Time
}

type Service struct {
	repository Repository
	n8n        N8NClient
	now        func() time.Time
}

func NewService(deps Dependencies) *Service {
	now := deps.Now
	if now == nil {
		now = time.Now
	}
	return &Service{
		repository: deps.Repository,
		n8n:        deps.N8N,
		now:        now,
	}
}

type WorkflowSummary struct {
	Workflow      domain.Workflow
	Project       domain.Project
	StepCount     int
	ArtifactCount int
	ApprovalCount int
	EventCount    int
}

type WorkflowDetail struct {
	Workflow  domain.Workflow
	Project   domain.Project
	Steps     []domain.Step
	Artifacts []domain.Artifact
	Approvals []domain.Approval
	Events    []domain.Event
}

type CreateProjectInput struct {
	Name          string
	GitHubOwner   string
	GitHubRepo    string
	DefaultBranch string
}

type UpdateProjectInput struct {
	Name          string
	GitHubOwner   string
	GitHubRepo    string
	DefaultBranch string
	Status        domain.ProjectStatus
}

type CreateWorkflowInput struct {
	ProjectID string
	Title     string
	Module    *string
	Problem   string
}

type ApprovalInput struct {
	Comment   *string
	DecidedBy string
}

type AddArtifactInput struct {
	WorkflowID     string
	ArtifactType   domain.ArtifactType
	Title          string
	GitHubURL      *string
	LocalPreview   *string
	CreatedByAgent *domain.Agent
}

type AddEventInput struct {
	WorkflowID  string
	Source      domain.EventSource
	EventType   string
	Message     string
	PayloadJSON json.RawMessage
}

type UpdateStatusInput struct {
	WorkflowID     string
	Status         domain.WorkflowStatus
	GitHubIssueURL *string
	GitHubPRURL    *string
	N8NExecutionID *string
	StepKey        *domain.StepKey
	StepStatus     *domain.StepStatus
	ErrorMessage   *string
}

type FeatureIntakePayload struct {
	WorkflowID string                `json:"workflow_id"`
	Project    FeatureProjectPayload `json:"project"`
	Feature    FeaturePayload        `json:"feature"`
}

type FeatureProjectPayload struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	GitHubOwner   string `json:"github_owner"`
	GitHubRepo    string `json:"github_repo"`
	DefaultBranch string `json:"default_branch"`
	ConfigPath    string `json:"config_path"`
}

type FeaturePayload struct {
	ID      string  `json:"id"`
	Title   string  `json:"title"`
	Module  *string `json:"module"`
	Problem string  `json:"problem"`
}

type ApprovalPayload struct {
	WorkflowID string                   `json:"workflow_id"`
	StepKey    domain.StepKey           `json:"step_key"`
	Decision   domain.ApprovalDecision  `json:"decision"`
	Comment    *string                  `json:"comment,omitempty"`
	DecidedBy  string                   `json:"decided_by"`
	Project    FeatureProjectPayload    `json:"project"`
	Feature    FeaturePayload           `json:"feature"`
	Artifacts  []ArtifactWebhookPayload `json:"artifacts"`
}

type ArtifactWebhookPayload struct {
	Type           domain.ArtifactType `json:"type"`
	Title          string              `json:"title"`
	GitHubURL      *string             `json:"github_url,omitempty"`
	LocalPreview   *string             `json:"local_preview,omitempty"`
	CreatedByAgent *domain.Agent       `json:"created_by_agent,omitempty"`
	CreatedAt      time.Time           `json:"created_at"`
}

func (service *Service) ListProjects(ctx context.Context) ([]domain.Project, error) {
	return service.repository.ListProjects(ctx)
}

func (service *Service) GetProject(ctx context.Context, id string) (domain.Project, error) {
	return service.repository.GetProject(ctx, id)
}

func (service *Service) CreateProject(ctx context.Context, input CreateProjectInput) (domain.Project, error) {
	project, err := domain.NewProject(input.Name, input.GitHubOwner, input.GitHubRepo, input.DefaultBranch, service.now().UTC())
	if err != nil {
		return domain.Project{}, err
	}
	return service.repository.CreateProject(ctx, project)
}

func (service *Service) UpdateProject(ctx context.Context, id string, input UpdateProjectInput) (domain.Project, error) {
	project, err := service.repository.GetProject(ctx, id)
	if err != nil {
		return domain.Project{}, err
	}

	updated, err := domain.UpdateProject(project, input.Name, input.GitHubOwner, input.GitHubRepo, input.DefaultBranch, input.Status, service.now().UTC())
	if err != nil {
		return domain.Project{}, err
	}
	return service.repository.UpdateProject(ctx, updated)
}

func (service *Service) DeleteProject(ctx context.Context, id string) error {
	return service.repository.DeleteProject(ctx, id)
}

func (service *Service) ListWorkflows(ctx context.Context) ([]WorkflowSummary, error) {
	return service.repository.ListWorkflows(ctx)
}

func (service *Service) GetWorkflow(ctx context.Context, id string) (WorkflowDetail, error) {
	return service.repository.GetWorkflow(ctx, id)
}

func (service *Service) CreateWorkflow(ctx context.Context, input CreateWorkflowInput) (WorkflowDetail, error) {
	now := service.now().UTC()
	project, err := service.repository.GetProject(ctx, input.ProjectID)
	if err != nil {
		return WorkflowDetail{}, err
	}
	if project.Status != domain.ProjectStatusActive {
		return WorkflowDetail{}, domain.ErrInvalidProjectStatus
	}

	workflow, err := domain.NewWorkflow(project.ID, FeatureIDFromTitle(input.Title), input.Title, input.Module, input.Problem, now)
	if err != nil {
		return WorkflowDetail{}, err
	}
	steps, err := domain.DefaultSteps("", now)
	if err != nil {
		return WorkflowDetail{}, err
	}
	event, err := domain.NewEvent("", domain.EventSourceAnton, string(domain.StepKeyIdeaCreated), "Feature idea was created in Hub", nil, now)
	if err != nil {
		return WorkflowDetail{}, err
	}

	detail, err := service.repository.CreateWorkflow(ctx, workflow, steps, event)
	if err != nil {
		return WorkflowDetail{}, err
	}

	if service.n8n == nil {
		return detail, nil
	}
	if err := service.n8n.StartFeatureWorkflow(ctx, intakePayload(detail)); err != nil {
		return service.markWorkflowFailed(ctx, detail.Workflow.ID, domain.StepKeySystemAnalysis, "n8n_intake_failed", fmt.Sprintf("n8n feature intake failed: %s", err.Error()))
	}

	return service.repository.GetWorkflow(ctx, detail.Workflow.ID)
}

func (service *Service) ApproveSpec(ctx context.Context, workflowID string, input ApprovalInput) (WorkflowDetail, error) {
	return service.approvalAction(ctx, workflowID, domain.StepKeySpecApproval, domain.ApprovalDecisionApproved, domain.WorkflowStatusSpecApproved, domain.StepStatusDone, input, true)
}

func (service *Service) RequestSpecChanges(ctx context.Context, workflowID string, input ApprovalInput) (WorkflowDetail, error) {
	return service.approvalAction(ctx, workflowID, domain.StepKeySpecApproval, domain.ApprovalDecisionChangesRequested, domain.WorkflowStatusSpecChangesRequested, domain.StepStatusFailed, input, false)
}

func (service *Service) ApproveArchitecture(ctx context.Context, workflowID string, input ApprovalInput) (WorkflowDetail, error) {
	return service.approvalAction(ctx, workflowID, domain.StepKeyArchitectureApproval, domain.ApprovalDecisionApproved, domain.WorkflowStatusArchitectureApproved, domain.StepStatusDone, input, true)
}

func (service *Service) RequestArchitectureChanges(ctx context.Context, workflowID string, input ApprovalInput) (WorkflowDetail, error) {
	return service.approvalAction(ctx, workflowID, domain.StepKeyArchitectureApproval, domain.ApprovalDecisionChangesRequested, domain.WorkflowStatusArchitectureChangesRequested, domain.StepStatusFailed, input, false)
}

func (service *Service) Reject(ctx context.Context, workflowID string, input ApprovalInput) (WorkflowDetail, error) {
	return service.approvalAction(ctx, workflowID, domain.StepKeySpecApproval, domain.ApprovalDecisionRejected, domain.WorkflowStatusRejected, domain.StepStatusFailed, input, false)
}

func (service *Service) AddArtifact(ctx context.Context, input AddArtifactInput) (WorkflowDetail, error) {
	now := service.now().UTC()
	artifact, err := domain.NewArtifact(input.WorkflowID, input.ArtifactType, input.Title, input.GitHubURL, input.LocalPreview, input.CreatedByAgent, now)
	if err != nil {
		return WorkflowDetail{}, err
	}
	if _, err := service.repository.CreateArtifact(ctx, artifact); err != nil {
		return WorkflowDetail{}, err
	}

	switch input.ArtifactType {
	case domain.ArtifactTypeSpec:
		_, _ = service.repository.UpdateWorkflowStatus(ctx, input.WorkflowID, domain.WorkflowStatusSpecReview, now)
		_ = service.repository.UpdateStep(ctx, input.WorkflowID, domain.StepKeySystemAnalysis, domain.StepStatusDone, nil, now)
	case domain.ArtifactTypeArchitecture:
		_, _ = service.repository.UpdateWorkflowStatus(ctx, input.WorkflowID, domain.WorkflowStatusArchitectureReview, now)
		_ = service.repository.UpdateStep(ctx, input.WorkflowID, domain.StepKeyArchitecture, domain.StepStatusDone, nil, now)
	}

	return service.repository.GetWorkflow(ctx, input.WorkflowID)
}

func (service *Service) AddEvent(ctx context.Context, input AddEventInput) (WorkflowDetail, error) {
	now := service.now().UTC()
	event, err := domain.NewEvent(input.WorkflowID, input.Source, input.EventType, input.Message, input.PayloadJSON, now)
	if err != nil {
		return WorkflowDetail{}, err
	}
	if _, err := service.repository.CreateEvent(ctx, event); err != nil {
		return WorkflowDetail{}, err
	}
	service.applyEventProgress(ctx, input.WorkflowID, input.EventType, now)
	return service.repository.GetWorkflow(ctx, input.WorkflowID)
}

func (service *Service) UpdateStatus(ctx context.Context, input UpdateStatusInput) (WorkflowDetail, error) {
	now := service.now().UTC()
	if !input.Status.Valid() {
		return WorkflowDetail{}, domain.ErrInvalidWorkflowStatus
	}
	if (input.StepKey == nil) != (input.StepStatus == nil) {
		return WorkflowDetail{}, domain.ErrInvalidStep
	}
	if input.StepKey != nil && !(*input.StepKey).Valid() {
		return WorkflowDetail{}, domain.ErrInvalidStep
	}
	if input.StepStatus != nil && !(*input.StepStatus).Valid() {
		return WorkflowDetail{}, domain.ErrInvalidStep
	}

	githubIssueURL := input.GitHubIssueURL
	githubPRURL := input.GitHubPRURL
	n8nExecutionID := input.N8NExecutionID
	if input.GitHubIssueURL != nil || input.GitHubPRURL != nil || input.N8NExecutionID != nil {
		workflowWithLinks, err := (domain.Workflow{}).WithLinks(input.GitHubIssueURL, input.GitHubPRURL, input.N8NExecutionID, now)
		if err != nil {
			return WorkflowDetail{}, err
		}
		githubIssueURL = workflowWithLinks.GitHubIssueURL
		githubPRURL = workflowWithLinks.GitHubPRURL
		n8nExecutionID = workflowWithLinks.N8NExecutionID
	}

	if _, err := service.repository.UpdateWorkflowStatus(ctx, input.WorkflowID, input.Status, now); err != nil {
		return WorkflowDetail{}, err
	}
	if input.GitHubIssueURL != nil || input.GitHubPRURL != nil || input.N8NExecutionID != nil {
		if _, err := service.repository.UpdateWorkflowLinks(ctx, input.WorkflowID, githubIssueURL, githubPRURL, n8nExecutionID, now); err != nil {
			return WorkflowDetail{}, err
		}
	}
	if input.StepKey != nil && input.StepStatus != nil {
		if err := service.repository.UpdateStep(ctx, input.WorkflowID, *input.StepKey, *input.StepStatus, input.ErrorMessage, now); err != nil {
			return WorkflowDetail{}, err
		}
	}
	return service.repository.GetWorkflow(ctx, input.WorkflowID)
}

func (service *Service) approvalAction(ctx context.Context, workflowID string, stepKey domain.StepKey, decision domain.ApprovalDecision, status domain.WorkflowStatus, stepStatus domain.StepStatus, input ApprovalInput, notifyN8N bool) (WorkflowDetail, error) {
	now := service.now().UTC()
	detail, err := service.repository.GetWorkflow(ctx, workflowID)
	if err != nil {
		return WorkflowDetail{}, err
	}

	approval, err := domain.NewApproval(workflowID, stepKey, decision, input.Comment, input.DecidedBy, now)
	if err != nil {
		return WorkflowDetail{}, err
	}
	if _, err := service.repository.CreateApproval(ctx, approval); err != nil {
		return WorkflowDetail{}, err
	}
	if _, err := service.repository.UpdateWorkflowStatus(ctx, workflowID, status, now); err != nil {
		return WorkflowDetail{}, err
	}
	var stepError *string
	if stepStatus == domain.StepStatusFailed {
		message := string(decision)
		stepError = &message
	}
	if err := service.repository.UpdateStep(ctx, workflowID, stepKey, stepStatus, stepError, now); err != nil {
		return WorkflowDetail{}, err
	}
	message := fmt.Sprintf("%s decision recorded for %s", decision, stepKey)
	event, err := domain.NewEvent(workflowID, domain.EventSourceAnton, string(decision), message, nil, now)
	if err != nil {
		return WorkflowDetail{}, err
	}
	if _, err := service.repository.CreateEvent(ctx, event); err != nil {
		return WorkflowDetail{}, err
	}

	if notifyN8N && service.n8n != nil {
		payload := ApprovalPayload{
			WorkflowID: workflowID,
			StepKey:    stepKey,
			Decision:   decision,
			Comment:    approval.Comment,
			DecidedBy:  approval.DecidedBy,
			Project:    projectPayload(detail.Project),
			Feature:    featurePayload(detail.Workflow),
			Artifacts:  artifactPayloads(detail.Artifacts),
		}
		if err := service.n8n.NotifyApproval(ctx, payload); err != nil {
			return service.markWorkflowFailed(ctx, workflowID, stepKey, "n8n_approval_failed", fmt.Sprintf("n8n approval webhook failed: %s", err.Error()))
		}
	}

	return service.repository.GetWorkflow(ctx, workflowID)
}

func (service *Service) markWorkflowFailed(ctx context.Context, workflowID string, stepKey domain.StepKey, eventType string, message string) (WorkflowDetail, error) {
	now := service.now().UTC()
	_, _ = service.repository.UpdateWorkflowStatus(ctx, workflowID, domain.WorkflowStatusFailed, now)
	_ = service.repository.UpdateStep(ctx, workflowID, stepKey, domain.StepStatusFailed, &message, now)
	event, err := domain.NewEvent(workflowID, domain.EventSourceSystem, eventType, message, nil, now)
	if err == nil {
		_, _ = service.repository.CreateEvent(ctx, event)
	}
	return service.repository.GetWorkflow(ctx, workflowID)
}

func (service *Service) applyEventProgress(ctx context.Context, workflowID string, eventType string, now time.Time) {
	switch eventType {
	case "spec_generated":
		_, _ = service.repository.UpdateWorkflowStatus(ctx, workflowID, domain.WorkflowStatusSpecReview, now)
		_ = service.repository.UpdateStep(ctx, workflowID, domain.StepKeySystemAnalysis, domain.StepStatusDone, nil, now)
	case "architecture_generated":
		_, _ = service.repository.UpdateWorkflowStatus(ctx, workflowID, domain.WorkflowStatusArchitectureReview, now)
		_ = service.repository.UpdateStep(ctx, workflowID, domain.StepKeyArchitecture, domain.StepStatusDone, nil, now)
	case "ready_for_implementation":
		_, _ = service.repository.UpdateWorkflowStatus(ctx, workflowID, domain.WorkflowStatusReadyForImplementation, now)
		_ = service.repository.UpdateStep(ctx, workflowID, domain.StepKeyCodexPromptGenerated, domain.StepStatusDone, nil, now)
		_ = service.repository.UpdateStep(ctx, workflowID, domain.StepKeyReadyForImplementation, domain.StepStatusDone, nil, now)
	}
}

func intakePayload(detail WorkflowDetail) FeatureIntakePayload {
	return FeatureIntakePayload{
		WorkflowID: detail.Workflow.ID,
		Project:    projectPayload(detail.Project),
		Feature:    featurePayload(detail.Workflow),
	}
}

func projectPayload(project domain.Project) FeatureProjectPayload {
	return FeatureProjectPayload{
		ID:            project.ID,
		Name:          project.Name,
		GitHubOwner:   project.GitHubOwner,
		GitHubRepo:    project.GitHubRepo,
		DefaultBranch: project.DefaultBranch,
		ConfigPath:    project.ConfigPath,
	}
}

func featurePayload(workflow domain.Workflow) FeaturePayload {
	return FeaturePayload{
		ID:      workflow.FeatureID,
		Title:   workflow.Title,
		Module:  workflow.Module,
		Problem: workflow.Problem,
	}
}

func artifactPayloads(artifacts []domain.Artifact) []ArtifactWebhookPayload {
	payloads := make([]ArtifactWebhookPayload, 0, len(artifacts))
	for _, artifact := range artifacts {
		payloads = append(payloads, ArtifactWebhookPayload{
			Type:           artifact.ArtifactType,
			Title:          artifact.Title,
			GitHubURL:      artifact.GitHubURL,
			LocalPreview:   artifact.LocalPreview,
			CreatedByAgent: artifact.CreatedByAgent,
			CreatedAt:      artifact.CreatedAt,
		})
	}
	return payloads
}
