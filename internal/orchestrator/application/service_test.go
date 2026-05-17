package application

import (
	"context"
	"errors"
	"slices"
	"strconv"
	"testing"
	"time"

	"github.com/anton415/anton415-hub/internal/orchestrator/domain"
)

func TestFeatureIDFromTitle(t *testing.T) {
	got := FeatureIDFromTitle("  Add task filtering!  ")
	if got != "add-task-filtering" {
		t.Fatalf("FeatureIDFromTitle() = %q, want add-task-filtering", got)
	}
}

func TestServiceCreateWorkflowCreatesBundleAndStartsN8N(t *testing.T) {
	store := newMemoryRepository()
	n8n := &fakeN8N{}
	now := time.Date(2026, 5, 17, 12, 0, 0, 0, time.UTC)
	service := NewService(Dependencies{
		Repository: store,
		N8N:        n8n,
		Now:        func() time.Time { return now },
	})
	project := mustCreateProject(t, service)

	detail, err := service.CreateWorkflow(context.Background(), CreateWorkflowInput{
		ProjectID: project.ID,
		Title:     "Add task filtering",
		Problem:   "Filter tasks by active, done, and archived.",
	})
	if err != nil {
		t.Fatalf("CreateWorkflow() error = %v", err)
	}

	if detail.Workflow.Status != domain.WorkflowStatusSystemAnalysisRunning {
		t.Fatalf("status = %q, want system_analysis_running", detail.Workflow.Status)
	}
	if detail.Workflow.FeatureID != "add-task-filtering" {
		t.Fatalf("feature id = %q, want add-task-filtering", detail.Workflow.FeatureID)
	}
	if got := stepKeys(detail.Steps); !slices.Equal(got, []domain.StepKey{
		domain.StepKeyIdeaCreated,
		domain.StepKeySystemAnalysis,
		domain.StepKeySpecApproval,
		domain.StepKeyArchitecture,
		domain.StepKeyArchitectureApproval,
		domain.StepKeyCodexPromptGenerated,
		domain.StepKeyReadyForImplementation,
	}) {
		t.Fatalf("step keys = %v, want default workflow steps", got)
	}
	if detail.Steps[0].Status != domain.StepStatusDone || detail.Steps[1].Status != domain.StepStatusRunning {
		t.Fatalf("step statuses = %s/%s, want done/running", detail.Steps[0].Status, detail.Steps[1].Status)
	}
	if len(detail.Events) != 1 || detail.Events[0].EventType != string(domain.StepKeyIdeaCreated) {
		t.Fatalf("events = %+v, want idea_created event", detail.Events)
	}
	if len(n8n.started) != 1 || n8n.started[0].WorkflowID != detail.Workflow.ID {
		t.Fatalf("n8n started = %+v, want workflow payload", n8n.started)
	}
}

func TestServiceMarksWorkflowFailedWhenN8NIntakeFails(t *testing.T) {
	store := newMemoryRepository()
	n8n := &fakeN8N{startErr: errors.New("webhook down")}
	service := NewService(Dependencies{Repository: store, N8N: n8n})
	project := mustCreateProject(t, service)

	detail, err := service.CreateWorkflow(context.Background(), CreateWorkflowInput{
		ProjectID: project.ID,
		Title:     "Broken intake",
		Problem:   "n8n is unavailable.",
	})
	if err != nil {
		t.Fatalf("CreateWorkflow() error = %v", err)
	}

	if detail.Workflow.Status != domain.WorkflowStatusFailed {
		t.Fatalf("status = %q, want failed", detail.Workflow.Status)
	}
	systemStep := stepByKey(detail.Steps, domain.StepKeySystemAnalysis)
	if systemStep == nil || systemStep.Status != domain.StepStatusFailed {
		t.Fatalf("system step = %+v, want failed", systemStep)
	}
	if got := lastEventType(detail.Events); got != "n8n_intake_failed" {
		t.Fatalf("last event = %q, want n8n_intake_failed", got)
	}
}

func TestServiceApprovesSpecAndNotifiesN8N(t *testing.T) {
	store := newMemoryRepository()
	n8n := &fakeN8N{}
	service := NewService(Dependencies{Repository: store, N8N: n8n})
	detail := mustCreateWorkflow(t, service, "Approval path")

	comment := "Spec is clear enough."
	detail, err := service.ApproveSpec(context.Background(), detail.Workflow.ID, ApprovalInput{
		Comment:   &comment,
		DecidedBy: "anton@example.com",
	})
	if err != nil {
		t.Fatalf("ApproveSpec() error = %v", err)
	}

	if detail.Workflow.Status != domain.WorkflowStatusSpecApproved {
		t.Fatalf("status = %q, want spec_approved", detail.Workflow.Status)
	}
	specStep := stepByKey(detail.Steps, domain.StepKeySpecApproval)
	if specStep == nil || specStep.Status != domain.StepStatusDone {
		t.Fatalf("spec approval step = %+v, want done", specStep)
	}
	if len(detail.Approvals) != 1 || detail.Approvals[0].Decision != domain.ApprovalDecisionApproved {
		t.Fatalf("approvals = %+v, want approved decision", detail.Approvals)
	}
	if len(n8n.approvals) != 1 || n8n.approvals[0].StepKey != domain.StepKeySpecApproval {
		t.Fatalf("n8n approvals = %+v, want spec approval payload", n8n.approvals)
	}
}

func TestServiceApprovalActionsUpdateWorkflowState(t *testing.T) {
	tests := []struct {
		name       string
		action     func(*Service, context.Context, string, ApprovalInput) (WorkflowDetail, error)
		status     domain.WorkflowStatus
		decision   domain.ApprovalDecision
		stepKey    domain.StepKey
		stepStatus domain.StepStatus
		notifies   bool
	}{
		{
			name:       "request spec changes",
			action:     (*Service).RequestSpecChanges,
			status:     domain.WorkflowStatusSpecChangesRequested,
			decision:   domain.ApprovalDecisionChangesRequested,
			stepKey:    domain.StepKeySpecApproval,
			stepStatus: domain.StepStatusFailed,
		},
		{
			name:       "approve architecture",
			action:     (*Service).ApproveArchitecture,
			status:     domain.WorkflowStatusArchitectureApproved,
			decision:   domain.ApprovalDecisionApproved,
			stepKey:    domain.StepKeyArchitectureApproval,
			stepStatus: domain.StepStatusDone,
			notifies:   true,
		},
		{
			name:       "request architecture changes",
			action:     (*Service).RequestArchitectureChanges,
			status:     domain.WorkflowStatusArchitectureChangesRequested,
			decision:   domain.ApprovalDecisionChangesRequested,
			stepKey:    domain.StepKeyArchitectureApproval,
			stepStatus: domain.StepStatusFailed,
		},
		{
			name:       "reject",
			action:     (*Service).Reject,
			status:     domain.WorkflowStatusRejected,
			decision:   domain.ApprovalDecisionRejected,
			stepKey:    domain.StepKeySpecApproval,
			stepStatus: domain.StepStatusFailed,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := newMemoryRepository()
			n8n := &fakeN8N{}
			service := NewService(Dependencies{Repository: store, N8N: n8n})
			detail := mustCreateWorkflow(t, service, tt.name)

			detail, err := tt.action(service, context.Background(), detail.Workflow.ID, ApprovalInput{DecidedBy: "anton@example.com"})
			if err != nil {
				t.Fatalf("approval action error = %v", err)
			}
			if detail.Workflow.Status != tt.status {
				t.Fatalf("status = %q, want %q", detail.Workflow.Status, tt.status)
			}
			if len(detail.Approvals) != 1 || detail.Approvals[0].Decision != tt.decision {
				t.Fatalf("approvals = %+v, want %q", detail.Approvals, tt.decision)
			}
			step := stepByKey(detail.Steps, tt.stepKey)
			if step == nil || step.Status != tt.stepStatus {
				t.Fatalf("step %s = %+v, want %s", tt.stepKey, step, tt.stepStatus)
			}
			if tt.notifies && len(n8n.approvals) != 1 {
				t.Fatalf("n8n approvals = %+v, want one notification", n8n.approvals)
			}
			if !tt.notifies && len(n8n.approvals) != 0 {
				t.Fatalf("n8n approvals = %+v, want no notification", n8n.approvals)
			}
		})
	}
}

func TestServiceMarksWorkflowFailedWhenApprovalWebhookFails(t *testing.T) {
	store := newMemoryRepository()
	n8n := &fakeN8N{approveErr: errors.New("webhook down")}
	service := NewService(Dependencies{Repository: store, N8N: n8n})
	detail := mustCreateWorkflow(t, service, "Approval webhook failure")

	detail, err := service.ApproveSpec(context.Background(), detail.Workflow.ID, ApprovalInput{DecidedBy: "anton@example.com"})
	if err != nil {
		t.Fatalf("ApproveSpec() error = %v", err)
	}
	if detail.Workflow.Status != domain.WorkflowStatusFailed {
		t.Fatalf("status = %q, want failed", detail.Workflow.Status)
	}
	specStep := stepByKey(detail.Steps, domain.StepKeySpecApproval)
	if specStep == nil || specStep.Status != domain.StepStatusFailed {
		t.Fatalf("spec approval step = %+v, want failed", specStep)
	}
	if got := lastEventType(detail.Events); got != "n8n_approval_failed" {
		t.Fatalf("last event = %q, want n8n_approval_failed", got)
	}
}

func TestServiceAddArtifactUpdatesWorkflowProgress(t *testing.T) {
	store := newMemoryRepository()
	service := NewService(Dependencies{Repository: store})
	detail := mustCreateWorkflow(t, service, "Spec artifact")

	detail, err := service.AddArtifact(context.Background(), AddArtifactInput{
		WorkflowID:   detail.Workflow.ID,
		ArtifactType: domain.ArtifactTypeSpec,
		Title:        "System specification",
	})
	if err != nil {
		t.Fatalf("AddArtifact() error = %v", err)
	}
	if detail.Workflow.Status != domain.WorkflowStatusSpecReview {
		t.Fatalf("status = %q, want spec_review", detail.Workflow.Status)
	}
	systemStep := stepByKey(detail.Steps, domain.StepKeySystemAnalysis)
	if systemStep == nil || systemStep.Status != domain.StepStatusDone {
		t.Fatalf("system analysis step = %+v, want done", systemStep)
	}
	if len(detail.Artifacts) != 1 || detail.Artifacts[0].ArtifactType != domain.ArtifactTypeSpec {
		t.Fatalf("artifacts = %+v, want spec artifact", detail.Artifacts)
	}
}

func TestServiceAddEventAppliesReadyProgress(t *testing.T) {
	store := newMemoryRepository()
	service := NewService(Dependencies{Repository: store})
	detail := mustCreateWorkflow(t, service, "Ready event")

	detail, err := service.AddEvent(context.Background(), AddEventInput{
		WorkflowID: detail.Workflow.ID,
		Source:     domain.EventSourceN8N,
		EventType:  "ready_for_implementation",
		Message:    "Codex prompt generated",
	})
	if err != nil {
		t.Fatalf("AddEvent() error = %v", err)
	}
	if detail.Workflow.Status != domain.WorkflowStatusReadyForImplementation {
		t.Fatalf("status = %q, want ready_for_implementation", detail.Workflow.Status)
	}
	for _, key := range []domain.StepKey{domain.StepKeyCodexPromptGenerated, domain.StepKeyReadyForImplementation} {
		step := stepByKey(detail.Steps, key)
		if step == nil || step.Status != domain.StepStatusDone {
			t.Fatalf("step %s = %+v, want done", key, step)
		}
	}
}

func TestServiceRejectsDuplicateFeatureIDPerProject(t *testing.T) {
	store := newMemoryRepository()
	service := NewService(Dependencies{Repository: store})
	project := mustCreateProject(t, service)

	_, err := service.CreateWorkflow(context.Background(), CreateWorkflowInput{
		ProjectID: project.ID,
		Title:     "Duplicate Feature",
		Problem:   "First workflow.",
	})
	if err != nil {
		t.Fatalf("CreateWorkflow() first error = %v", err)
	}
	_, err = service.CreateWorkflow(context.Background(), CreateWorkflowInput{
		ProjectID: project.ID,
		Title:     "Duplicate Feature",
		Problem:   "Second workflow.",
	})
	if !errors.Is(err, domain.ErrDuplicateWorkflow) {
		t.Fatalf("CreateWorkflow() duplicate error = %v, want ErrDuplicateWorkflow", err)
	}
}

func TestServiceUpdateStatusValidatesWorkflowLinkURLs(t *testing.T) {
	store := newMemoryRepository()
	service := NewService(Dependencies{Repository: store})
	detail := mustCreateWorkflow(t, service, "Ready callback")

	invalidIssueURL := "javascript:alert(1)"
	_, err := service.UpdateStatus(context.Background(), UpdateStatusInput{
		WorkflowID:     detail.Workflow.ID,
		Status:         domain.WorkflowStatusReadyForImplementation,
		GitHubIssueURL: &invalidIssueURL,
	})
	if !errors.Is(err, domain.ErrInvalidURL) {
		t.Fatalf("UpdateStatus() error = %v, want ErrInvalidURL", err)
	}

	unchanged, err := service.GetWorkflow(context.Background(), detail.Workflow.ID)
	if err != nil {
		t.Fatalf("GetWorkflow() error = %v", err)
	}
	if unchanged.Workflow.Status != domain.WorkflowStatusSystemAnalysisRunning {
		t.Fatalf("status = %q, want unchanged system_analysis_running", unchanged.Workflow.Status)
	}
	if unchanged.Workflow.GitHubIssueURL != nil {
		t.Fatalf("github issue url = %q, want nil", *unchanged.Workflow.GitHubIssueURL)
	}
}

func TestServiceUpdateStatusNormalizesWorkflowLinks(t *testing.T) {
	store := newMemoryRepository()
	service := NewService(Dependencies{Repository: store})
	detail := mustCreateWorkflow(t, service, "Ready callback")

	issueURL := " https://github.com/anton415/anton415-hub/issues/67 "
	updated, err := service.UpdateStatus(context.Background(), UpdateStatusInput{
		WorkflowID:     detail.Workflow.ID,
		Status:         domain.WorkflowStatusReadyForImplementation,
		GitHubIssueURL: &issueURL,
	})
	if err != nil {
		t.Fatalf("UpdateStatus() error = %v", err)
	}
	if updated.Workflow.GitHubIssueURL == nil || *updated.Workflow.GitHubIssueURL != "https://github.com/anton415/anton415-hub/issues/67" {
		t.Fatalf("github issue url = %v, want trimmed GitHub issue URL", updated.Workflow.GitHubIssueURL)
	}
}

type fakeN8N struct {
	startErr   error
	approveErr error
	started    []FeatureIntakePayload
	approvals  []ApprovalPayload
}

func (fake *fakeN8N) StartFeatureWorkflow(_ context.Context, payload FeatureIntakePayload) error {
	fake.started = append(fake.started, payload)
	return fake.startErr
}

func (fake *fakeN8N) NotifyApproval(_ context.Context, payload ApprovalPayload) error {
	fake.approvals = append(fake.approvals, payload)
	return fake.approveErr
}

type memoryRepository struct {
	nextID    int
	projects  map[string]domain.Project
	workflows map[string]domain.Workflow
	steps     map[string][]domain.Step
	artifacts map[string][]domain.Artifact
	approvals map[string][]domain.Approval
	events    map[string][]domain.Event
}

func newMemoryRepository() *memoryRepository {
	return &memoryRepository{
		projects:  map[string]domain.Project{},
		workflows: map[string]domain.Workflow{},
		steps:     map[string][]domain.Step{},
		artifacts: map[string][]domain.Artifact{},
		approvals: map[string][]domain.Approval{},
		events:    map[string][]domain.Event{},
	}
}

func (repo *memoryRepository) id(prefix string) string {
	repo.nextID++
	return prefix + "-" + strconv.Itoa(repo.nextID)
}

func (repo *memoryRepository) WithTx(ctx context.Context, fn func(Repository) error) error {
	return fn(repo)
}

func (repo *memoryRepository) ListProjects(context.Context) ([]domain.Project, error) {
	projects := make([]domain.Project, 0, len(repo.projects))
	for _, project := range repo.projects {
		projects = append(projects, project)
	}
	return projects, nil
}

func (repo *memoryRepository) GetProject(_ context.Context, id string) (domain.Project, error) {
	project, ok := repo.projects[id]
	if !ok {
		return domain.Project{}, ErrNotFound
	}
	return project, nil
}

func (repo *memoryRepository) CreateProject(_ context.Context, project domain.Project) (domain.Project, error) {
	project.ID = repo.id("project")
	repo.projects[project.ID] = project
	return project, nil
}

func (repo *memoryRepository) UpdateProject(_ context.Context, project domain.Project) (domain.Project, error) {
	if _, ok := repo.projects[project.ID]; !ok {
		return domain.Project{}, ErrNotFound
	}
	repo.projects[project.ID] = project
	return project, nil
}

func (repo *memoryRepository) DeleteProject(_ context.Context, id string) error {
	if _, ok := repo.projects[id]; !ok {
		return ErrNotFound
	}
	delete(repo.projects, id)
	return nil
}

func (repo *memoryRepository) ListWorkflows(context.Context) ([]WorkflowSummary, error) {
	summaries := make([]WorkflowSummary, 0, len(repo.workflows))
	for _, workflow := range repo.workflows {
		project := repo.projects[workflow.ProjectID]
		summaries = append(summaries, WorkflowSummary{Workflow: workflow, Project: project})
	}
	return summaries, nil
}

func (repo *memoryRepository) GetWorkflow(_ context.Context, id string) (WorkflowDetail, error) {
	workflow, ok := repo.workflows[id]
	if !ok {
		return WorkflowDetail{}, ErrNotFound
	}
	return WorkflowDetail{
		Workflow:  workflow,
		Project:   repo.projects[workflow.ProjectID],
		Steps:     append([]domain.Step(nil), repo.steps[id]...),
		Artifacts: append([]domain.Artifact(nil), repo.artifacts[id]...),
		Approvals: append([]domain.Approval(nil), repo.approvals[id]...),
		Events:    append([]domain.Event(nil), repo.events[id]...),
	}, nil
}

func (repo *memoryRepository) CreateWorkflow(_ context.Context, workflow domain.Workflow, steps []domain.Step, event domain.Event) (WorkflowDetail, error) {
	if _, ok := repo.projects[workflow.ProjectID]; !ok {
		return WorkflowDetail{}, ErrNotFound
	}
	for _, existing := range repo.workflows {
		if existing.ProjectID == workflow.ProjectID && existing.FeatureID == workflow.FeatureID {
			return WorkflowDetail{}, domain.ErrDuplicateWorkflow
		}
	}
	workflow.ID = repo.id("workflow")
	repo.workflows[workflow.ID] = workflow
	for i := range steps {
		steps[i].ID = repo.id("step")
		steps[i].WorkflowID = workflow.ID
	}
	event.ID = repo.id("event")
	event.WorkflowID = workflow.ID
	repo.steps[workflow.ID] = append([]domain.Step(nil), steps...)
	repo.events[workflow.ID] = []domain.Event{event}
	return repo.GetWorkflow(context.Background(), workflow.ID)
}

func (repo *memoryRepository) UpdateWorkflowStatus(_ context.Context, id string, status domain.WorkflowStatus, now time.Time) (domain.Workflow, error) {
	workflow, ok := repo.workflows[id]
	if !ok {
		return domain.Workflow{}, ErrNotFound
	}
	workflow.Status = status
	workflow.UpdatedAt = now
	repo.workflows[id] = workflow
	return workflow, nil
}

func (repo *memoryRepository) UpdateWorkflowLinks(_ context.Context, id string, githubIssueURL *string, githubPRURL *string, n8nExecutionID *string, now time.Time) (domain.Workflow, error) {
	workflow, ok := repo.workflows[id]
	if !ok {
		return domain.Workflow{}, ErrNotFound
	}
	if githubIssueURL != nil {
		workflow.GitHubIssueURL = githubIssueURL
	}
	if githubPRURL != nil {
		workflow.GitHubPRURL = githubPRURL
	}
	if n8nExecutionID != nil {
		workflow.N8NExecutionID = n8nExecutionID
	}
	workflow.UpdatedAt = now
	repo.workflows[id] = workflow
	return workflow, nil
}

func (repo *memoryRepository) UpdateStep(_ context.Context, workflowID string, stepKey domain.StepKey, status domain.StepStatus, errorMessage *string, now time.Time) error {
	steps := repo.steps[workflowID]
	for index, step := range steps {
		if step.StepKey == stepKey {
			step.Status = status
			step.ErrorMessage = errorMessage
			if status == domain.StepStatusDone || status == domain.StepStatusFailed {
				step.FinishedAt = &now
			}
			steps[index] = step
			repo.steps[workflowID] = steps
			return nil
		}
	}
	return ErrNotFound
}

func (repo *memoryRepository) CreateArtifact(_ context.Context, artifact domain.Artifact) (domain.Artifact, error) {
	artifact.ID = repo.id("artifact")
	repo.artifacts[artifact.WorkflowID] = append(repo.artifacts[artifact.WorkflowID], artifact)
	return artifact, nil
}

func (repo *memoryRepository) CreateApproval(_ context.Context, approval domain.Approval) (domain.Approval, error) {
	approval.ID = repo.id("approval")
	repo.approvals[approval.WorkflowID] = append(repo.approvals[approval.WorkflowID], approval)
	return approval, nil
}

func (repo *memoryRepository) CreateEvent(_ context.Context, event domain.Event) (domain.Event, error) {
	event.ID = repo.id("event")
	repo.events[event.WorkflowID] = append(repo.events[event.WorkflowID], event)
	return event, nil
}

func mustCreateProject(t *testing.T, service *Service) domain.Project {
	t.Helper()
	project, err := service.CreateProject(context.Background(), CreateProjectInput{
		Name:          "Anton415 Hub",
		GitHubOwner:   "anton415",
		GitHubRepo:    "anton415-hub",
		DefaultBranch: "main",
	})
	if err != nil {
		t.Fatalf("CreateProject() error = %v", err)
	}
	return project
}

func mustCreateWorkflow(t *testing.T, service *Service, title string) WorkflowDetail {
	t.Helper()
	project := mustCreateProject(t, service)
	detail, err := service.CreateWorkflow(context.Background(), CreateWorkflowInput{
		ProjectID: project.ID,
		Title:     title,
		Problem:   "n8n reports workflow progress.",
	})
	if err != nil {
		t.Fatalf("CreateWorkflow() error = %v", err)
	}
	return detail
}

func stepKeys(steps []domain.Step) []domain.StepKey {
	keys := make([]domain.StepKey, 0, len(steps))
	for _, step := range steps {
		keys = append(keys, step.StepKey)
	}
	return keys
}

func stepByKey(steps []domain.Step, key domain.StepKey) *domain.Step {
	for _, step := range steps {
		if step.StepKey == key {
			return &step
		}
	}
	return nil
}

func lastEventType(events []domain.Event) string {
	if len(events) == 0 {
		return ""
	}
	return events[len(events)-1].EventType
}
