package http

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	authhttp "github.com/anton415/anton415-hub/internal/auth/adapters/http"
	"github.com/anton415/anton415-hub/internal/orchestrator/application"
	"github.com/anton415/anton415-hub/internal/orchestrator/domain"
	"github.com/anton415/anton415-hub/internal/platform/httpjson"
)

type Service interface {
	ListProjects(ctx context.Context) ([]domain.Project, error)
	GetProject(ctx context.Context, id string) (domain.Project, error)
	CreateProject(ctx context.Context, input application.CreateProjectInput) (domain.Project, error)
	UpdateProject(ctx context.Context, id string, input application.UpdateProjectInput) (domain.Project, error)
	DeleteProject(ctx context.Context, id string) error
	ListWorkflows(ctx context.Context) ([]application.WorkflowSummary, error)
	GetWorkflow(ctx context.Context, id string) (application.WorkflowDetail, error)
	CreateWorkflow(ctx context.Context, input application.CreateWorkflowInput) (application.WorkflowDetail, error)
	ApproveSpec(ctx context.Context, workflowID string, input application.ApprovalInput) (application.WorkflowDetail, error)
	RequestSpecChanges(ctx context.Context, workflowID string, input application.ApprovalInput) (application.WorkflowDetail, error)
	ApproveArchitecture(ctx context.Context, workflowID string, input application.ApprovalInput) (application.WorkflowDetail, error)
	RequestArchitectureChanges(ctx context.Context, workflowID string, input application.ApprovalInput) (application.WorkflowDetail, error)
	Reject(ctx context.Context, workflowID string, input application.ApprovalInput) (application.WorkflowDetail, error)
	AddArtifact(ctx context.Context, input application.AddArtifactInput) (application.WorkflowDetail, error)
	AddEvent(ctx context.Context, input application.AddEventInput) (application.WorkflowDetail, error)
	UpdateStatus(ctx context.Context, input application.UpdateStatusInput) (application.WorkflowDetail, error)
}

type Config struct {
	CallbackToken string
}

type Handler struct {
	service Service
	config  Config
}

func NewUserRouter(service Service, config Config) http.Handler {
	handler := Handler{service: service, config: config}
	r := chi.NewRouter()

	r.Get("/projects", handler.listProjects)
	r.Post("/projects", handler.createProject)
	r.Get("/projects/{project_id}", handler.getProject)
	r.Patch("/projects/{project_id}", handler.updateProject)
	r.Delete("/projects/{project_id}", handler.deleteProject)

	r.Get("/workflows", handler.listWorkflows)
	r.Post("/workflows", handler.createWorkflow)
	r.Get("/workflows/{workflow_id}", handler.getWorkflow)
	r.Post("/workflows/{workflow_id}/approve-spec", handler.approveSpec)
	r.Post("/workflows/{workflow_id}/request-spec-changes", handler.requestSpecChanges)
	r.Post("/workflows/{workflow_id}/approve-architecture", handler.approveArchitecture)
	r.Post("/workflows/{workflow_id}/request-architecture-changes", handler.requestArchitectureChanges)
	r.Post("/workflows/{workflow_id}/reject", handler.reject)

	return r
}

func NewCallbackRouter(service Service, config Config) http.Handler {
	handler := Handler{service: service, config: config}
	r := chi.NewRouter()
	r.Use(handler.requireCallbackToken)
	r.Post("/events", handler.n8nEvent)
	r.Post("/artifacts", handler.n8nArtifact)
	r.Post("/status", handler.n8nStatus)
	return r
}

func (handler Handler) listProjects(w http.ResponseWriter, r *http.Request) {
	projects, err := handler.service.ListProjects(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	response := make([]projectResponse, 0, len(projects))
	for _, project := range projects {
		response = append(response, projectDTO(project))
	}
	writeData(w, http.StatusOK, response)
}

func (handler Handler) getProject(w http.ResponseWriter, r *http.Request) {
	project, err := handler.service.GetProject(r.Context(), chi.URLParam(r, "project_id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeData(w, http.StatusOK, projectDTO(project))
}

func (handler Handler) createProject(w http.ResponseWriter, r *http.Request) {
	var request projectRequest
	if !decodeRequest(w, r, &request) {
		return
	}
	project, err := handler.service.CreateProject(r.Context(), application.CreateProjectInput{
		Name:          request.Name,
		GitHubOwner:   request.GitHubOwner,
		GitHubRepo:    request.GitHubRepo,
		DefaultBranch: request.DefaultBranch,
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeData(w, http.StatusCreated, projectDTO(project))
}

func (handler Handler) updateProject(w http.ResponseWriter, r *http.Request) {
	var request projectRequest
	if !decodeRequest(w, r, &request) {
		return
	}
	project, err := handler.service.UpdateProject(r.Context(), chi.URLParam(r, "project_id"), application.UpdateProjectInput{
		Name:          request.Name,
		GitHubOwner:   request.GitHubOwner,
		GitHubRepo:    request.GitHubRepo,
		DefaultBranch: request.DefaultBranch,
		Status:        domain.ProjectStatus(request.Status),
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeData(w, http.StatusOK, projectDTO(project))
}

func (handler Handler) deleteProject(w http.ResponseWriter, r *http.Request) {
	if err := handler.service.DeleteProject(r.Context(), chi.URLParam(r, "project_id")); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (handler Handler) listWorkflows(w http.ResponseWriter, r *http.Request) {
	workflows, err := handler.service.ListWorkflows(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	response := make([]workflowSummaryResponse, 0, len(workflows))
	for _, workflow := range workflows {
		response = append(response, workflowSummaryDTO(workflow))
	}
	writeData(w, http.StatusOK, response)
}

func (handler Handler) getWorkflow(w http.ResponseWriter, r *http.Request) {
	workflow, err := handler.service.GetWorkflow(r.Context(), chi.URLParam(r, "workflow_id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeData(w, http.StatusOK, workflowDetailDTO(workflow))
}

func (handler Handler) createWorkflow(w http.ResponseWriter, r *http.Request) {
	var request createWorkflowRequest
	if !decodeRequest(w, r, &request) {
		return
	}
	workflow, err := handler.service.CreateWorkflow(r.Context(), application.CreateWorkflowInput{
		ProjectID: request.ProjectID,
		Title:     request.Title,
		Module:    request.Module,
		Problem:   request.Problem,
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeData(w, http.StatusCreated, workflowDetailDTO(workflow))
}

func (handler Handler) approveSpec(w http.ResponseWriter, r *http.Request) {
	handler.approvalAction(w, r, handler.service.ApproveSpec)
}

func (handler Handler) requestSpecChanges(w http.ResponseWriter, r *http.Request) {
	handler.approvalAction(w, r, handler.service.RequestSpecChanges)
}

func (handler Handler) approveArchitecture(w http.ResponseWriter, r *http.Request) {
	handler.approvalAction(w, r, handler.service.ApproveArchitecture)
}

func (handler Handler) requestArchitectureChanges(w http.ResponseWriter, r *http.Request) {
	handler.approvalAction(w, r, handler.service.RequestArchitectureChanges)
}

func (handler Handler) reject(w http.ResponseWriter, r *http.Request) {
	handler.approvalAction(w, r, handler.service.Reject)
}

func (handler Handler) approvalAction(w http.ResponseWriter, r *http.Request, action func(context.Context, string, application.ApprovalInput) (application.WorkflowDetail, error)) {
	var request approvalRequest
	if !decodeRequest(w, r, &request) {
		return
	}
	decidedBy := "anton"
	if principal, ok := authhttp.PrincipalFromContext(r.Context()); ok && strings.TrimSpace(principal.Email) != "" {
		decidedBy = principal.Email
	}
	workflow, err := action(r.Context(), chi.URLParam(r, "workflow_id"), application.ApprovalInput{
		Comment:   request.Comment,
		DecidedBy: decidedBy,
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeData(w, http.StatusOK, workflowDetailDTO(workflow))
}

func (handler Handler) n8nEvent(w http.ResponseWriter, r *http.Request) {
	var request n8nEventRequest
	if !decodeRequest(w, r, &request) {
		return
	}
	if strings.TrimSpace(request.Source) == "" {
		request.Source = string(domain.EventSourceN8N)
	}
	workflow, err := handler.service.AddEvent(r.Context(), application.AddEventInput{
		WorkflowID:  request.WorkflowID,
		Source:      domain.EventSource(request.Source),
		EventType:   request.EventType,
		Message:     request.Message,
		PayloadJSON: request.Payload,
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeData(w, http.StatusOK, workflowDetailDTO(workflow))
}

func (handler Handler) n8nArtifact(w http.ResponseWriter, r *http.Request) {
	var request n8nArtifactRequest
	if !decodeRequest(w, r, &request) {
		return
	}
	var createdByAgent *domain.Agent
	if request.CreatedByAgent != nil {
		agent := domain.Agent(*request.CreatedByAgent)
		createdByAgent = &agent
	}
	workflow, err := handler.service.AddArtifact(r.Context(), application.AddArtifactInput{
		WorkflowID:     request.WorkflowID,
		ArtifactType:   domain.ArtifactType(request.ArtifactType),
		Title:          request.Title,
		GitHubURL:      request.GitHubURL,
		LocalPreview:   request.LocalPreview,
		CreatedByAgent: createdByAgent,
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeData(w, http.StatusOK, workflowDetailDTO(workflow))
}

func (handler Handler) n8nStatus(w http.ResponseWriter, r *http.Request) {
	var request n8nStatusRequest
	if !decodeRequest(w, r, &request) {
		return
	}
	var stepKey *domain.StepKey
	if request.StepKey != nil {
		value := domain.StepKey(*request.StepKey)
		stepKey = &value
	}
	var stepStatus *domain.StepStatus
	if request.StepStatus != nil {
		value := domain.StepStatus(*request.StepStatus)
		stepStatus = &value
	}
	workflow, err := handler.service.UpdateStatus(r.Context(), application.UpdateStatusInput{
		WorkflowID:     request.WorkflowID,
		Status:         domain.WorkflowStatus(request.Status),
		GitHubIssueURL: request.GitHubIssueURL,
		GitHubPRURL:    request.GitHubPRURL,
		N8NExecutionID: request.N8NExecutionID,
		StepKey:        stepKey,
		StepStatus:     stepStatus,
		ErrorMessage:   request.ErrorMessage,
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeData(w, http.StatusOK, workflowDetailDTO(workflow))
}

func (handler Handler) requireCallbackToken(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := strings.TrimSpace(handler.config.CallbackToken)
		if token == "" {
			writeErrorResponse(w, http.StatusServiceUnavailable, "callback_token_not_configured", "orchestrator n8n callback token is not configured")
			return
		}
		if r.Header.Get("Authorization") != "Bearer "+token {
			writeErrorResponse(w, http.StatusUnauthorized, "unauthorized", "n8n callback token is invalid")
			return
		}
		next.ServeHTTP(w, r)
	})
}

type projectRequest struct {
	Name          string `json:"name"`
	GitHubOwner   string `json:"github_owner"`
	GitHubRepo    string `json:"github_repo"`
	DefaultBranch string `json:"default_branch"`
	Status        string `json:"status"`
}

type createWorkflowRequest struct {
	ProjectID string  `json:"project_id"`
	Title     string  `json:"title"`
	Module    *string `json:"module"`
	Problem   string  `json:"problem"`
}

type approvalRequest struct {
	Comment *string `json:"comment"`
}

type n8nEventRequest struct {
	WorkflowID string          `json:"workflow_id"`
	Source     string          `json:"source"`
	EventType  string          `json:"event_type"`
	Message    string          `json:"message"`
	Payload    json.RawMessage `json:"payload"`
}

type n8nArtifactRequest struct {
	WorkflowID     string  `json:"workflow_id"`
	ArtifactType   string  `json:"artifact_type"`
	Title          string  `json:"title"`
	GitHubURL      *string `json:"github_url"`
	LocalPreview   *string `json:"local_preview"`
	CreatedByAgent *string `json:"created_by_agent"`
}

type n8nStatusRequest struct {
	WorkflowID     string  `json:"workflow_id"`
	Status         string  `json:"status"`
	GitHubIssueURL *string `json:"github_issue_url"`
	GitHubPRURL    *string `json:"github_pr_url"`
	N8NExecutionID *string `json:"n8n_execution_id"`
	StepKey        *string `json:"step_key"`
	StepStatus     *string `json:"step_status"`
	ErrorMessage   *string `json:"error_message"`
}

type responseEnvelope struct {
	Data any `json:"data"`
}

type errorEnvelope struct {
	Error apiError `json:"error"`
}

type apiError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type projectResponse struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	GitHubOwner   string `json:"github_owner"`
	GitHubRepo    string `json:"github_repo"`
	DefaultBranch string `json:"default_branch"`
	ConfigPath    string `json:"config_path"`
	Status        string `json:"status"`
	CreatedAt     string `json:"created_at"`
	UpdatedAt     string `json:"updated_at"`
}

type workflowResponse struct {
	ID             string  `json:"id"`
	ProjectID      string  `json:"project_id"`
	FeatureID      string  `json:"feature_id"`
	Title          string  `json:"title"`
	Module         *string `json:"module"`
	Problem        string  `json:"problem"`
	Status         string  `json:"status"`
	GitHubIssueURL *string `json:"github_issue_url"`
	GitHubPRURL    *string `json:"github_pr_url"`
	N8NExecutionID *string `json:"n8n_execution_id"`
	CreatedAt      string  `json:"created_at"`
	UpdatedAt      string  `json:"updated_at"`
}

type workflowSummaryResponse struct {
	Workflow      workflowResponse `json:"workflow"`
	Project       projectResponse  `json:"project"`
	StepCount     int              `json:"step_count"`
	ArtifactCount int              `json:"artifact_count"`
	ApprovalCount int              `json:"approval_count"`
	EventCount    int              `json:"event_count"`
}

type workflowDetailResponse struct {
	Workflow  workflowResponse   `json:"workflow"`
	Project   projectResponse    `json:"project"`
	Steps     []stepResponse     `json:"steps"`
	Artifacts []artifactResponse `json:"artifacts"`
	Approvals []approvalResponse `json:"approvals"`
	Events    []eventResponse    `json:"events"`
}

type stepResponse struct {
	ID           string  `json:"id"`
	WorkflowID   string  `json:"workflow_id"`
	StepKey      string  `json:"step_key"`
	Title        string  `json:"title"`
	Agent        *string `json:"agent"`
	Status       string  `json:"status"`
	StartedAt    *string `json:"started_at"`
	FinishedAt   *string `json:"finished_at"`
	ErrorMessage *string `json:"error_message"`
}

type artifactResponse struct {
	ID             string  `json:"id"`
	WorkflowID     string  `json:"workflow_id"`
	ArtifactType   string  `json:"artifact_type"`
	Title          string  `json:"title"`
	GitHubURL      *string `json:"github_url"`
	LocalPreview   *string `json:"local_preview"`
	CreatedByAgent *string `json:"created_by_agent"`
	CreatedAt      string  `json:"created_at"`
}

type approvalResponse struct {
	ID         string  `json:"id"`
	WorkflowID string  `json:"workflow_id"`
	StepKey    string  `json:"step_key"`
	Decision   string  `json:"decision"`
	Comment    *string `json:"comment"`
	DecidedBy  string  `json:"decided_by"`
	DecidedAt  string  `json:"decided_at"`
}

type eventResponse struct {
	ID          string          `json:"id"`
	WorkflowID  string          `json:"workflow_id"`
	Source      string          `json:"source"`
	EventType   string          `json:"event_type"`
	Message     string          `json:"message"`
	PayloadJSON json.RawMessage `json:"payload_json"`
	CreatedAt   string          `json:"created_at"`
}

func projectDTO(project domain.Project) projectResponse {
	return projectResponse{
		ID:            project.ID,
		Name:          project.Name,
		GitHubOwner:   project.GitHubOwner,
		GitHubRepo:    project.GitHubRepo,
		DefaultBranch: project.DefaultBranch,
		ConfigPath:    project.ConfigPath,
		Status:        string(project.Status),
		CreatedAt:     formatTimestamp(project.CreatedAt),
		UpdatedAt:     formatTimestamp(project.UpdatedAt),
	}
}

func workflowDTO(workflow domain.Workflow) workflowResponse {
	return workflowResponse{
		ID:             workflow.ID,
		ProjectID:      workflow.ProjectID,
		FeatureID:      workflow.FeatureID,
		Title:          workflow.Title,
		Module:         workflow.Module,
		Problem:        workflow.Problem,
		Status:         string(workflow.Status),
		GitHubIssueURL: workflow.GitHubIssueURL,
		GitHubPRURL:    workflow.GitHubPRURL,
		N8NExecutionID: workflow.N8NExecutionID,
		CreatedAt:      formatTimestamp(workflow.CreatedAt),
		UpdatedAt:      formatTimestamp(workflow.UpdatedAt),
	}
}

func workflowSummaryDTO(summary application.WorkflowSummary) workflowSummaryResponse {
	return workflowSummaryResponse{
		Workflow:      workflowDTO(summary.Workflow),
		Project:       projectDTO(summary.Project),
		StepCount:     summary.StepCount,
		ArtifactCount: summary.ArtifactCount,
		ApprovalCount: summary.ApprovalCount,
		EventCount:    summary.EventCount,
	}
}

func workflowDetailDTO(detail application.WorkflowDetail) workflowDetailResponse {
	steps := make([]stepResponse, 0, len(detail.Steps))
	for _, step := range detail.Steps {
		steps = append(steps, stepDTO(step))
	}
	artifacts := make([]artifactResponse, 0, len(detail.Artifacts))
	for _, artifact := range detail.Artifacts {
		artifacts = append(artifacts, artifactDTO(artifact))
	}
	approvals := make([]approvalResponse, 0, len(detail.Approvals))
	for _, approval := range detail.Approvals {
		approvals = append(approvals, approvalDTO(approval))
	}
	events := make([]eventResponse, 0, len(detail.Events))
	for _, event := range detail.Events {
		events = append(events, eventDTO(event))
	}

	return workflowDetailResponse{
		Workflow:  workflowDTO(detail.Workflow),
		Project:   projectDTO(detail.Project),
		Steps:     steps,
		Artifacts: artifacts,
		Approvals: approvals,
		Events:    events,
	}
}

func stepDTO(step domain.Step) stepResponse {
	var agent *string
	if step.Agent != nil {
		value := string(*step.Agent)
		agent = &value
	}
	return stepResponse{
		ID:           step.ID,
		WorkflowID:   step.WorkflowID,
		StepKey:      string(step.StepKey),
		Title:        step.Title,
		Agent:        agent,
		Status:       string(step.Status),
		StartedAt:    formatTimestampPtr(step.StartedAt),
		FinishedAt:   formatTimestampPtr(step.FinishedAt),
		ErrorMessage: step.ErrorMessage,
	}
}

func artifactDTO(artifact domain.Artifact) artifactResponse {
	var createdByAgent *string
	if artifact.CreatedByAgent != nil {
		value := string(*artifact.CreatedByAgent)
		createdByAgent = &value
	}
	return artifactResponse{
		ID:             artifact.ID,
		WorkflowID:     artifact.WorkflowID,
		ArtifactType:   string(artifact.ArtifactType),
		Title:          artifact.Title,
		GitHubURL:      artifact.GitHubURL,
		LocalPreview:   artifact.LocalPreview,
		CreatedByAgent: createdByAgent,
		CreatedAt:      formatTimestamp(artifact.CreatedAt),
	}
}

func approvalDTO(approval domain.Approval) approvalResponse {
	return approvalResponse{
		ID:         approval.ID,
		WorkflowID: approval.WorkflowID,
		StepKey:    string(approval.StepKey),
		Decision:   string(approval.Decision),
		Comment:    approval.Comment,
		DecidedBy:  approval.DecidedBy,
		DecidedAt:  formatTimestamp(approval.DecidedAt),
	}
}

func eventDTO(event domain.Event) eventResponse {
	payload := event.PayloadJSON
	if len(payload) == 0 {
		payload = json.RawMessage("null")
	}
	return eventResponse{
		ID:          event.ID,
		WorkflowID:  event.WorkflowID,
		Source:      string(event.Source),
		EventType:   event.EventType,
		Message:     event.Message,
		PayloadJSON: payload,
		CreatedAt:   formatTimestamp(event.CreatedAt),
	}
}

func decodeRequest(w http.ResponseWriter, r *http.Request, value any) bool {
	if err := httpjson.DecodeRequest(w, r, value); err != nil {
		if errors.Is(err, httpjson.ErrRequestBodyTooLarge) {
			writeErrorResponse(w, http.StatusRequestEntityTooLarge, "payload_too_large", "request body is too large")
			return false
		}
		writeErrorResponse(w, http.StatusBadRequest, "bad_request", "request body must be valid JSON")
		return false
	}
	return true
}

func writeData(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(responseEnvelope{Data: data}); err != nil {
		slog.Error("write orchestrator json response", slog.String("error", err.Error()))
	}
}

func writeError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, domain.ErrInvalidProjectName):
		writeErrorResponse(w, http.StatusBadRequest, "validation_error", "project name is required")
	case errors.Is(err, domain.ErrInvalidRepository):
		writeErrorResponse(w, http.StatusBadRequest, "validation_error", "github owner and repo are required")
	case errors.Is(err, domain.ErrInvalidProjectStatus):
		writeErrorResponse(w, http.StatusBadRequest, "validation_error", "project status is invalid")
	case errors.Is(err, domain.ErrInvalidWorkflowTitle):
		writeErrorResponse(w, http.StatusBadRequest, "validation_error", "workflow title is required")
	case errors.Is(err, domain.ErrInvalidWorkflowProblem):
		writeErrorResponse(w, http.StatusBadRequest, "validation_error", "workflow problem is required")
	case errors.Is(err, domain.ErrInvalidWorkflowStatus):
		writeErrorResponse(w, http.StatusBadRequest, "validation_error", "workflow status is invalid")
	case errors.Is(err, domain.ErrInvalidStep):
		writeErrorResponse(w, http.StatusBadRequest, "validation_error", "workflow step is invalid")
	case errors.Is(err, domain.ErrInvalidArtifact):
		writeErrorResponse(w, http.StatusBadRequest, "validation_error", "artifact is invalid")
	case errors.Is(err, domain.ErrInvalidApprovalDecision):
		writeErrorResponse(w, http.StatusBadRequest, "validation_error", "approval decision is invalid")
	case errors.Is(err, domain.ErrInvalidEvent):
		writeErrorResponse(w, http.StatusBadRequest, "validation_error", "event is invalid")
	case errors.Is(err, domain.ErrInvalidURL):
		writeErrorResponse(w, http.StatusBadRequest, "validation_error", "url must be http or https")
	case errors.Is(err, application.ErrNotFound):
		writeErrorResponse(w, http.StatusNotFound, "not_found", "orchestrator resource was not found")
	default:
		slog.Error("orchestrator handler error", slog.String("error", err.Error()))
		writeErrorResponse(w, http.StatusInternalServerError, "internal_error", "internal server error")
	}
}

func writeErrorResponse(w http.ResponseWriter, status int, code string, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(errorEnvelope{Error: apiError{Code: code, Message: message}}); err != nil {
		slog.Error("write orchestrator error response", slog.String("error", err.Error()))
	}
}

func formatTimestamp(value time.Time) string {
	return value.UTC().Format(time.RFC3339)
}

func formatTimestampPtr(value *time.Time) *string {
	if value == nil {
		return nil
	}
	formatted := formatTimestamp(*value)
	return &formatted
}
