package http

import (
	"bytes"
	"context"
	"net/http/httptest"
	"testing"

	"github.com/anton415/anton415-hub/internal/orchestrator/application"
	"github.com/anton415/anton415-hub/internal/orchestrator/domain"
)

func TestN8NEventForcesSourceAndRequiresCallbackToken(t *testing.T) {
	service := &fakeService{}
	router := NewCallbackRouter(service, Config{CallbackToken: "secret"})

	request := httptest.NewRequest("POST", "/events", bytes.NewBufferString(`{
		"workflow_id": "workflow-1",
		"source": "github",
		"event_type": "spec_generated",
		"message": "Spec generated"
	}`))
	request.Header.Set("Authorization", "Bearer secret")
	response := httptest.NewRecorder()

	router.ServeHTTP(response, request)

	if response.Code != 200 {
		t.Fatalf("status = %d, want 200; body=%s", response.Code, response.Body.String())
	}
	if service.eventInput.Source != domain.EventSourceN8N {
		t.Fatalf("event source = %q, want n8n", service.eventInput.Source)
	}

	unauthorized := httptest.NewRecorder()
	router.ServeHTTP(unauthorized, httptest.NewRequest("POST", "/events", bytes.NewBufferString(`{}`)))
	if unauthorized.Code != 401 {
		t.Fatalf("unauthorized status = %d, want 401", unauthorized.Code)
	}
}

func TestN8NStatusRequiresFields(t *testing.T) {
	service := &fakeService{}
	router := NewCallbackRouter(service, Config{CallbackToken: "secret"})
	request := httptest.NewRequest("POST", "/status", bytes.NewBufferString(`{"workflow_id":"workflow-1"}`))
	request.Header.Set("Authorization", "Bearer secret")
	response := httptest.NewRecorder()

	router.ServeHTTP(response, request)

	if response.Code != 400 {
		t.Fatalf("status = %d, want 400; body=%s", response.Code, response.Body.String())
	}
}

type fakeService struct {
	eventInput application.AddEventInput
}

func (fake *fakeService) ListProjects(context.Context) ([]domain.Project, error) {
	panic("unused")
}

func (fake *fakeService) GetProject(context.Context, string) (domain.Project, error) {
	panic("unused")
}

func (fake *fakeService) CreateProject(context.Context, application.CreateProjectInput) (domain.Project, error) {
	panic("unused")
}

func (fake *fakeService) UpdateProject(context.Context, string, application.UpdateProjectInput) (domain.Project, error) {
	panic("unused")
}

func (fake *fakeService) DeleteProject(context.Context, string) error {
	panic("unused")
}

func (fake *fakeService) ListWorkflows(context.Context) ([]application.WorkflowSummary, error) {
	panic("unused")
}

func (fake *fakeService) GetWorkflow(context.Context, string) (application.WorkflowDetail, error) {
	panic("unused")
}

func (fake *fakeService) CreateWorkflow(context.Context, application.CreateWorkflowInput) (application.WorkflowDetail, error) {
	panic("unused")
}

func (fake *fakeService) ApproveSpec(context.Context, string, application.ApprovalInput) (application.WorkflowDetail, error) {
	panic("unused")
}

func (fake *fakeService) RequestSpecChanges(context.Context, string, application.ApprovalInput) (application.WorkflowDetail, error) {
	panic("unused")
}

func (fake *fakeService) ApproveArchitecture(context.Context, string, application.ApprovalInput) (application.WorkflowDetail, error) {
	panic("unused")
}

func (fake *fakeService) RequestArchitectureChanges(context.Context, string, application.ApprovalInput) (application.WorkflowDetail, error) {
	panic("unused")
}

func (fake *fakeService) Reject(context.Context, string, application.ApprovalInput) (application.WorkflowDetail, error) {
	panic("unused")
}

func (fake *fakeService) AddArtifact(context.Context, application.AddArtifactInput) (application.WorkflowDetail, error) {
	panic("unused")
}

func (fake *fakeService) AddEvent(_ context.Context, input application.AddEventInput) (application.WorkflowDetail, error) {
	fake.eventInput = input
	return application.WorkflowDetail{Workflow: domain.Workflow{ID: input.WorkflowID}}, nil
}

func (fake *fakeService) UpdateStatus(context.Context, application.UpdateStatusInput) (application.WorkflowDetail, error) {
	panic("unused")
}
